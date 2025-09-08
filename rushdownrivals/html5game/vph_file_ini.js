function sfjs_extend(cls, sup, fields){
	var proto;
	if(sup){
		function base(){}
		base.prototype=sup.prototype;
		var proto=new base();
		for(var name in fields)proto[name]=fields[name];
		if(fields.toString!==Object.prototype.toString)proto.toString = fields.toString;
		
	} else proto = fields;
	cls.prototype=proto;
}
function sfjs_toString(){
	return js_Boot___string_rec(this,"");
}
function EReg(r,opt){
	this.r=new RegExp(r,opt.split("u").join(""));
}
EReg.prototype={
	match:function(s){
		if(this.r.global)this.r.lastIndex=0;
		this.r.m=this.r.exec(s);
		this.r.s=s;
		return this.r.m!=null;
	},
	matched:function(n){
		if(this.r.m!=null&&n>=0&&n<this.r.m.length){
			return this.r.m[n];
		}else throw new js__Boot_HaxeError("EReg::matched");
	},
	matchedPos:function(){
		if(this.r.m==null)throw new js__Boot_HaxeError("No string matched");
		return {pos:this.r.m.index,len:this.r.m[0].length};
	},
	matchSub:function(s,pos,len){
		if(len==null)len=-1;
		if(this.r.global){
			this.r.lastIndex=pos;
			var tmp=this.r;
			var tmp1;
			if(len<0){
				tmp1=s;
			}else tmp1=HxOverrides_substr(s,0,pos+len);
			this.r.m=tmp.exec(tmp1);
			var b=this.r.m!=null;
			if(b)this.r.s=s;
			return b;
		}else {
			var b1=this.match((len<0)?HxOverrides_substr(s,pos,null):HxOverrides_substr(s,pos,len));
			if(b1){
				this.r.s=s;
				this.r.m.index+=pos;
			}
			return b1;
		}
	},
	map:function(s,f){
		var offset=0;
		var buf_b="";
		while(true){
			if(offset>=s.length){
				break;
			}else if(!this.matchSub(s,offset)){
				buf_b+=Std_string(HxOverrides_substr(s,offset,null));
				break;
			}
			var p=this.matchedPos();
			buf_b+=Std_string(HxOverrides_substr(s,offset,p.pos-offset));
			buf_b+=Std_string(f(this));
			if(p.len==0){
				buf_b+=Std_string(HxOverrides_substr(s,p.pos,1));
				offset=p.pos+1;
			}else offset=p.pos+p.len;
			if(!this.r.global)break;
		}
		if(!this.r.global&&offset>0&&offset<s.length)buf_b+=Std_string(HxOverrides_substr(s,offset,null));
		return buf_b;
	}
}
/// Returns\changes whether INI keys should be always quoted.
function file_ini_opt_quote_keys(force){
	if(force==null)force=null;
	if(force!=null){
		file_ini_quoteKeys=force;
		return force;
	}else return file_ini_quoteKeys;
}
/// Returns\changes whether INI values should be always quoted.
function file_ini_opt_quote_values(force){
	if(force==null)force=null;
	if(force!=null){
		file_ini_quoteValues=force;
		return force;
	}else return file_ini_quoteValues;
}
function file_ini_print_rfEsc(rx){
	var c=rx.matched(1).charCodeAt(0);
	switch(c){
		case 10:return "\\n";
		case 13:return "\\r";
		case 34:return '\\"';
		default:return "\\x"+StringTools_hex(c,2);
	}
}
function file_ini_print_rfTrim(s){
	return file_ini_print_rxTrim.match(s);
}
function file_ini_parse_rfEsc(rx){
	return String.fromCharCode(Std_parseInt("0x"+rx.matched(1)));
}
function file_ini_parse_unescape(s){
	s=StringTools_replace(StringTools_replace(StringTools_replace(s,"\\r","\r"),"\\n","\n"),'\\"','"');
	if(s.indexOf("\\x")>=0)s=file_ini_parse_rxEsc.map(s,file_ini_parse_rfEsc);
	return s;
}
/// Reads an INI file from the given string.
function file_ini_parse(src){
	var out=new file_ini();
	if(src.length==0)return out;
	var c, qc, s, q_source, q_pos, q_length;
	q_source=src;
	q_length=q_source.length;
	q_pos=0;
	if(q_source.charCodeAt(0)==239&&q_source.charCodeAt(1)==187&&q_source.charCodeAt(2)==191)q_pos=3;
	if(src.indexOf("\r")>=0){
		if(src.indexOf("\n")>=0){
			s="\r\n";
		}else s="\r";
	}else s="\n";
	var sep=file_ini_item_Sep(s);
	var sep2=sep;
	var equ="=";
	out.nextSep=sep;
	out.nextEqu=equ;
	var section=out.sectionList[0];
	var items=section.items;
	var item;
	var start=q_pos;
	while(q_pos<q_length){
		c=q_source.charCodeAt(q_pos);
		switch(c){
			case 9:case 10:case 13:case 32:++q_pos;break;
			default:
				if(q_pos>start){
					s=q_source.substring(start,q_pos);
					sep2=sep;
					sep=file_ini_item_Sep(s);
					items.push(sep);
				}else sep2=null;
				start=q_pos;
				var valid;
				switch(c){
					case 35:case 59:
						while(q_pos<q_length){
							switch(q_source.charCodeAt(q_pos)){
								case 10:case 13:break;
								default:
									++q_pos;
									continue;
							}
							break;
						}
						s=q_source.substring(start,q_pos);
						items.push(file_ini_item_Comment(s));
						break;
					case 91:
						s=null;
						while(q_pos<q_length){
							switch(q_source.charCodeAt(q_pos)){
								case 34:
									if(q_pos==start+1){
										qc=c;
										start=++q_pos;
										while(q_pos<q_length){
											c=q_source.charCodeAt(q_pos);
											if(c==qc){
												break;
											}else if(c==92){
												++q_pos;
												++q_pos;
											}else ++q_pos;
										}
										s=q_source.substring(start,q_pos);
										s=file_ini_parse_unescape(s);
										if(c==qc)++q_pos;
									}else {
										++q_pos;
										continue;
									}
									break;
								case 93:
									if(s==null)s=q_source.substring(start+1,q_pos);
									var next=out.section_add_raw(s);
									if(sep2!=null){
										items.splice(items.length-1,1);
										next.prefix=sep;
										sep=sep2;
									}
									section.nextSep=sep;
									section.nextEqu=equ;
									section=next;
									items=section.items;
									++q_pos;
									break;
								default:
									++q_pos;
									continue;
							}
							break;
						}
						break;
					default:
						var till=start;
						var pair=new file_ini_pair();
						valid=true;
						if(c==34||c==39){
							qc=c;
							start=++q_pos;
							while(q_pos<q_length){
								c=q_source.charCodeAt(q_pos);
								if(c==qc){
									break;
								}else if(c==92){
									++q_pos;
									++q_pos;
								}else ++q_pos;
							}
							s=q_source.substring(start,q_pos);
							s=file_ini_parse_unescape(s);
							if(c==qc)++q_pos;
							till=q_pos;
							while(q_pos<q_length){
								switch(q_source.charCodeAt(q_pos)){
									case 9:case 32:
										++q_pos;
										continue;
									case 61:++q_pos;break;
									default:valid=false;
								}
								break;
							}
						}else {
							while(q_pos<q_length){
								switch(q_source.charCodeAt(q_pos)){
									case 10:case 13:valid=false;break;
									case 9:case 32:
										++q_pos;
										continue;
									case 35:case 59:valid=false;break;
									case 61:++q_pos;break;
									default:
										till=q_pos;
										++q_pos;
										continue;
								}
								break;
							}
							++till;
							s=q_source.substring(start,till);
						}
						pair.key=s;
						if(valid)while(q_pos<q_length){
							c=q_source.charCodeAt(q_pos);
							switch(c){
								case 10:case 13:valid=false;break;
								case 9:case 32:
									++q_pos;
									continue;
							}
							break;
						}
						if(valid){
							s=q_source.substring(till,q_pos);
							equ=s;
							pair.equ=s;
							item=file_ini_item_Pair(pair);
							pair.item=item;
							items.push(item);
							section.pairs[pair.key]=pair;
							start=q_pos;
							if(c==34||c==39){
								qc=c;
								start=++q_pos;
								while(q_pos<q_length){
									c=q_source.charCodeAt(q_pos);
									if(c==qc){
										break;
									}else if(c==92){
										++q_pos;
										++q_pos;
									}else ++q_pos;
								}
								s=q_source.substring(start,q_pos);
								s=file_ini_parse_unescape(s);
								if(c==qc)++q_pos;
								till=q_pos;
								while(q_pos<q_length){
									switch(q_source.charCodeAt(q_pos)){
										case 10:case 13:break;
										case 35:case 59:
											while(q_pos<q_length){
												switch(q_source.charCodeAt(q_pos)){
													case 10:case 13:break;
													default:
														++q_pos;
														continue;
												}
												break;
											}
											items.push(file_ini_item_Comment(q_source.substring(till,q_pos)));
											break;
										default:
											++q_pos;
											continue;
									}
									break;
								}
							}else {
								till=q_pos;
								while(q_pos<q_length){
									switch(q_source.charCodeAt(q_pos)){
										case 10:case 13:break;
										case 9:case 32:
											++q_pos;
											continue;
										case 35:case 59:
											while(q_pos<q_length){
												switch(q_source.charCodeAt(q_pos)){
													case 10:case 13:break;
													default:
														++q_pos;
														continue;
												}
												break;
											}
											s=q_source.substring(till+1,q_pos);
											items.push(file_ini_item_Comment(s));
											break;
										default:
											till=q_pos;
											++q_pos;
											continue;
									}
									break;
								}
								s=q_source.substring(start,till+1);
							}
							pair.val=s;
						}else {
							while(q_pos<q_length){
								switch(q_source.charCodeAt(q_pos)){
									case 10:case 13:break;
									default:
										++q_pos;
										continue;
								}
								break;
							}
							s=q_source.substring(start,q_pos);
							items.push(file_ini_item_Comment(s));
						}
				}
				start=q_pos;
		}
	}
	if(q_pos>start){
		s=q_source.substring(start,q_pos);
		sep2=sep;
		sep=file_ini_item_Sep(s);
		items.push(sep);
	}else sep2=null;
	section.nextSep=sep;
	section.nextEqu=equ;
	out.nextSep=sep;
	out.nextEqu=equ;
	return out;
}
///
function file_ini_create(){
	return new file_ini();
}
/// Opens the given file for reading/writing.
function file_ini_open(path,secure){
	if(secure==null)secure=false;
	var src=gml_Script_gmcallback_file_ini_open(null,null,path,secure);
	var ini;
	if(src!=null){
		ini=file_ini_parse(src);
	}else ini=new file_ini();
	if(secure){
		ini.format=2;
	}else ini.format=1;
	ini.path=path;
	return ini;
}
/// Destroys all associated data structures (without flushing)
function file_ini_destroy(self){
	self.destroy();
}
/// Flushes the file (if needed) and destroys it.
function file_ini_close(self){
	self.close();
}
/// Flushes the file's contents onto disc (if needed)
function file_ini_flush(self){
	if(self.changed){
		self.changed=false;
		gml_Script_gmcallback_file_ini_flush(null,null,self.path,self.print(),self.format==2);
	}
	return;
}
/// Changes the file' flush location and/or format.
function file_ini_bind(self,path,secure){
	if(path==null)path=null;
	if(secure==null)secure=false;
	self.bind(path,secure);
}
/// Removes the given section.
function file_ini_section_delete(self,name){
	self.section_delete(name);
}
/// Returns whether the file contains a section of given name.
function file_ini_section_exists(self,name){
	return self.sectionMap[name]!=null;
}
/// Returns an array with section' names.
function file_ini_section_names(self){
	return self.section_names();
}
function file_ini_read_raw(self,section,key){
	return self.read_raw(section,key);
}
function file_ini_write_raw(self,section,key,val){
	self.write_raw(section,key,val);
}
/// Returns whether the given key exists in the given section of the file.
function file_ini_key_exists(self,section,key){
	return self.key_exists(section,key);
}
/// Removes the given key-value pair from the given section.
function file_ini_key_delete(self,section,key){
	return self.key_delete(section,key);
}
/// Returns a list of keys in the given section.
function file_ini_key_names(self,section){
	return self.key_names(section);
}
/// Returns a string corresponding to the file' contents as of calling.
function file_ini_print(self){
	return self.print();
}
///
function file_ini_read_string(self,section,key,defValue){
	return self.read_string(section,key,defValue);
}
///
function file_ini_read_real(self,section,key,defValue){
	return self.read_real(section,key,defValue);
}
///
function file_ini_read_int(self,section,key,defValue){
	return self.read_int(section,key,defValue);
}
///
function file_ini_write_string(self,section,key,value){
	self.write_string(section,key,value);
}
///
function file_ini_write_real(self,section,key,value){
	self.write_real(section,key,value);
}
///
function file_ini_write_int(self,section,key,value){
	self.write_int(section,key,value);
}
function file_ini(){
	this.nextEqu="=";
	this.nextSep=file_ini_item_Sep("\r\n");
	this.sectionMap=Object.create(null);
	this.sectionList=[];
	this.path=null;
	this.format=0;
	this.changed=false;
	this.section_add_raw("");
}
file_ini.prototype={
	destroy:function(){
		var scl=this.sectionList;
		var i=0;
		for(var _g=scl.length;i<_g;i++){
			var _this=scl[i];
			var this1=_this.items;
			var this2=_this.pairs;
		}
		var this3=this.sectionMap;
	},
	close:function(){
		if(this.changed){
			this.changed=false;
			gml_Script_gmcallback_file_ini_flush(null,null,this.path,this.print(),this.format==2);
		}
		this.destroy();
	},
	flush:function(){
		if(this.changed){
			this.changed=false;
			gml_Script_gmcallback_file_ini_flush(null,null,this.path,this.print(),this.format==2);
		}
	},
	bind:function(path,secure){
		if(path==null)path=null;
		if(secure==null)secure=false;
		this.path=path;
		if(path!=null){
			if(secure){
				this.format=2;
			}else this.format=1;
		}else this.format=0;
		this.changed=true;
	},
	section_add_raw:function(name){
		var sct=new file_ini_section(name);
		if(name==""){
			this.sectionList.splice(0,0,sct);
		}else this.sectionList.push(sct);
		this.sectionMap[sct.name]=sct;
		sct.prefix=this.nextSep;
		sct.nextSep=this.nextSep;
		sct.nextEqu=this.nextEqu;
		return sct;
	},
	section_delete:function(name){
		var sct=this.sectionMap[name];
		if(sct==null)return;
		HxOverrides_remove(this.sectionList,sct);
		delete this.sectionMap[name];
		var this2=sct.items;
		var this3=sct.pairs;
		this.changed=true;
	},
	section_exists:function(name){
		return this.sectionMap[name]!=null;
	},
	section_names:function(){
		var out=[];
		var found=0;
		var scl=this.sectionList;
		var i=0;
		for(var _g=scl.length;i<_g;i++){
			var sct=scl[i];
			if(sct.items.length>0){
				out[found]=sct.name;
				++found;
			}
		}
		return out;
	},
	read_raw:function(section,key){
		var sct=this.sectionMap[section];
		if(sct!=null){
			var pair=sct.pairs[key];
			if(pair!=null)return pair.val;
		}
		return null;
	},
	write_raw:function(section,key,val){
		var sct=this.sectionMap[section];
		if(sct==null)sct=this.section_add_raw(section);
		var pair=sct.pairs[key];
		if(pair==null){
			pair=new file_ini_pair();
			pair.key=key;
			pair.val=val;
			pair.equ=sct.nextEqu;
			var item=file_ini_item_Pair(pair);
			pair.item=item;
			var items=sct.items;
			var num=items.length;
			if(num>0){
				if(items[num-1][1]!=0)items.push(sct.nextSep);
			}else if(section!="")items.push(sct.nextSep);
			items.push(item);
			sct.pairs[key]=pair;
		}else pair.val=val;
		this.changed=true;
	},
	key_exists:function(section,key){
		var sct=this.sectionMap[section];
		if(sct!=null){
			return sf_ds__StringDictionary_StringDictionary_Impl__exists_fn.call(sct.pairs,key);
		}else return false;
	},
	key_delete:function(section,key){
		var sct=this.sectionMap[section];
		if(sct==null)return false;
		var pair=sct.pairs[key];
		if(pair==null)return false;
		var item=pair.item;
		var items=sct.items;
		var pos=items.indexOf(item);
		items.splice(pos,1);
		if(pos<items.length){
			if(items[pos][1]==1)items.splice(pos,1);
		}
		if(pos>0){
			if(items[pos-1][1]==0)items.splice(pos-1,1);
		}
		delete sct.pairs[key];
		this.changed=true;
		return true;
	},
	key_names:function(section){
		var sct=this.sectionMap[section];
		if(sct==null)return null;
		var out=[];
		var num=0;
		var scl=sct.items;
		var i=0;
		for(var _g=scl.length;i<_g;i++){
			var item=scl[i];
			if(item[1]==2){
				out[num]=item[2].key;
				++num;
			}
		}
		return out;
	},
	print:function(){
		var r=new StringBuf();
		var qs, qz, qitem;
		var scl=this.sectionList;
		var i=0;
		for(var _g=scl.length;i<_g;i++){
			var sct=scl[i];
			if(sct.name!=""){
				if(sct.prefix!=null&&r.b.length>0){
					var _g2=sct.prefix;
					switch(_g2[1]){
						case 0:
							var s=_g2[2];
							if(s==null){
								r.b+="null";
							}else r.b+=""+s;
							break;
						case 1:
							var s1=_g2[2];
							if(s1==null){
								r.b+="null";
							}else r.b+=""+s1;
							break;
					}
				}
				r.b+="[";
				qs=sct.name;
				qz=qs.indexOf("]")>=0;
				if(qz||file_ini_print_rxEsc.match(qs)){
					r.b+='"';
					r.b+=Std_string(file_ini_print_rxEsc.map(qs,file_ini_print_rfEsc));
					r.b+='"';
				}else if(qs==null){
					r.b+="null";
				}else r.b+=""+qs;
				r.b+="]";
			}
			var sil=sct.items;
			var k=0;
			for(var _g21=sil.length;k<_g21;k++){
				qitem=sil[k];
				switch(qitem[1]){
					case 0:
						var s3=qitem[2];
						if(s3==null){
							r.b+="null";
						}else r.b+=""+s3;
						break;
					case 1:
						var s4=qitem[2];
						if(s4==null){
							r.b+="null";
						}else r.b+=""+s4;
						break;
					case 2:
						var p=qitem[2];
						qs=p.key;
						if(!file_ini_quoteKeys){
							qz=file_ini_print_rxTrim.match(qs);
						}else qz=true;
						if(qz||file_ini_print_rxEsc.match(qs)){
							r.b+='"';
							r.b+=Std_string(file_ini_print_rxEsc.map(qs,file_ini_print_rfEsc));
							r.b+='"';
						}else if(qs==null){
							r.b+="null";
						}else r.b+=""+qs;
						r.b+=Std_string(p.equ);
						qs=p.val;
						if(!file_ini_quoteValues){
							qz=file_ini_print_rxTrim.match(qs);
						}else qz=true;
						if(qz||file_ini_print_rxEsc.match(qs)){
							r.b+='"';
							r.b+=Std_string(file_ini_print_rxEsc.map(qs,file_ini_print_rfEsc));
							r.b+='"';
						}else if(qs==null){
							r.b+="null";
						}else r.b+=""+qs;
						break;
				}
			}
		}
		return r.b;
	},
	read_string:function(section,key,defValue){
		var r=this.read_raw(section,key);
		if(r!=null){
			return r;
		}else return defValue;
	},
	read_real:function(section,key,defValue){
		var s=this.read_raw(section,key);
		if(s==null)return defValue;
		var r=parseFloat(s);
		if(r+1!=r+1)return defValue;
		return r;
	},
	read_int:function(section,key,defValue){
		var s=this.read_raw(section,key);
		if(s==null)return defValue;
		var r=Std_parseInt(s);
		if(r+1!=r+1)return defValue;
		return r;
	},
	write_string:function(section,key,value){
		this.write_raw(section,key,(value==null)?"null":""+value);
	},
	write_real:function(section,key,value){
		var s;
		if(value==null){
			s="null";
		}else s=""+value;
		this.write_raw(section,key,s);
	},
	write_int:function(section,key,value){
		this.write_raw(section,key,Std_string(value|0));
	}
}
function file_ini_section(name){
	this.prefix=null;
	this.pairs=Object.create(null);
	this.items=[];
	this.name=name;
}
function file_ini_pair(){
	this.item=null;
}
var file_ini_item={__ename__:true}
function file_ini_item_Sep(s){
	var r=["Sep",0,s];
	r.__enum__=file_ini_item;
	r.toString=sfjs_toString;
	return r;
}
function file_ini_item_Comment(s){
	var r=["Comment",1,s];
	r.__enum__=file_ini_item;
	r.toString=sfjs_toString;
	return r;
}
function file_ini_item_Pair(p){
	var r=["Pair",2,p];
	r.__enum__=file_ini_item;
	r.toString=sfjs_toString;
	return r;
}
function HxOverrides_cca(s,index){
	var x=s.charCodeAt(index);
	if(x!=x)return undefined;
	return x;
}
function HxOverrides_substr(s,pos,len){
	if(len==null)len=null;
	if(len==null){
		len=s.length;
	}else if(len<0){
		if(pos==0){
			len=s.length+len;
		}else return "";
	}
	return s.substr(pos,len);
}
function HxOverrides_remove(a,obj){
	var i=a.indexOf(obj);
	if(i==-1)return false;
	a.splice(i,1);
	return true;
}
function Std_string(s){
	return js_Boot___string_rec(s,"");
}
function Std_parseInt(x){
	var i=parseInt(x,10);
	if(i==0){
		var c1=HxOverrides_cca(x,1);
		if(c1==120||c1==88)i=parseInt(x);
	}
	if(isNaN(i))return null;
	return i;
}
function StringBuf(){
	this.b="";
}
function StringTools_replace(s,sub,by){
	return s.split(sub).join(by);
}
function StringTools_hex(n,digits){
	if(digits==null)digits=null;
	var s="";
	var hexChars="0123456789ABCDEF";
	while(true){
		s=hexChars.charAt(n&15)+s;
		n>>>=4;
		if(!(n>0))break;
	}
	if(digits!=null)while(s.length<digits){
		s="0"+s;
	}
	return s;
}
function haxe_io_Eof(){ }
haxe_io_Eof.prototype={
	toString:function(){
		return "Eof";
	}
}
function js__Boot_HaxeError_wrap(val){
	if((val instanceof Error)){
		return val;
	}else return new js__Boot_HaxeError(val);
}
function js__Boot_HaxeError(val){
	Error.call(this);
	this.val=val;
	this.message=String(val);
	if(Error.captureStackTrace)Error.captureStackTrace(this,js__Boot_HaxeError);
}
sfjs_extend(js__Boot_HaxeError,Error,{});
function js_Boot___string_rec(o,s){
	if(o==null)return "null";
	if(s.length>=5)return "<...>";
	var t=typeof(o);
	if(t=="function"&&(o.__name__||o.__ename__))t="object";
	switch(t){
		case "function":return "<function>";
		case "object":
			if(o instanceof Array){
				if(o.__enum__){
					if(o.length==2)return o[0];
					var str=o[0]+"(";
					s+="\t";
					var i=2;
					for(var _g=o.length;i<_g;i++)if(i!=2){
						str+=","+js_Boot___string_rec(o[i],s);
					}else str+=js_Boot___string_rec(o[i],s);
					return str+")";
				}
				var l=o.length;
				var i1;
				var str1="[";
				s+="\t";
				var i2=0;
				for(var _g2=l;i2<_g2;i2++)str1+=((i2>0)?",":"")+js_Boot___string_rec(o[i2],s);
				str1+="]";
				return str1;
			}
			var tostr;
			try{
				tostr=o.toString;
			}catch(e){
				return "???";
			}
			if(tostr!=null&&tostr!=Object.toString&&typeof(tostr)=="function"){
				var s2=o.toString();
				if(s2!="[object Object]")return s2;
			}
			var k=null;
			var str2="{\n";
			s+="\t";
			var hasp=o.hasOwnProperty!=null;
			for( var k in o ) {;
			if(hasp&&!o.hasOwnProperty(k))continue;
			if(k=="prototype"||k=="__class__"||k=="__super__"||k=="__interfaces__"||k=="__properties__")continue;
			if(str2.length!=2)str2+=", \n";
			str2+=s+k+" : "+js_Boot___string_rec(o[k],s);
			};
			s=s.substring(1);
			str2+="\n"+s+"}";
			return str2;
		case "string":return o;
		default:return String(o);
	}
}
var file_ini_quoteKeys=false;
var file_ini_quoteValues=false;
var file_ini_print_rxEsc=new EReg('([\r\n"])',"g");
var file_ini_print_rxTrim=new EReg("(?:[ \t].+|.+[ \t]$)","g");
var file_ini_parse_rxEsc=new EReg("\\\\x([0-9a-fA-F]{2})","g");
var sf_ds__StringDictionary_StringDictionary_Impl__exists_fn=Object.prototype.hasOwnProperty;
// Generated at 2017-03-16 18:53:10 (342ms)

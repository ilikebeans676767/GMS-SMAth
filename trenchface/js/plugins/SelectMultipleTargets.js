/*:
* @plugindesc This plugin allows the user to mark a skill as capable of selecting multiple
* single targets, so that it repeats, but not against random enemies.
* [Version 3.0]
* @author Zevia | ST0RMTiger
*
* @help For a skill or item, make sure the scope is either 1 enemy or 1 ally. This
* plugin won't work with other scopes. In the skill or item's notebox, put
* <multipleTargets: x>, where x is the number of targets you want the skill to
* affect and allow selection for. For example, if you put <multipleTargets: 4>,
* then the skill will let you select 4 targets, even 4 times the same target.
*
* -- mod by ST0RMTiger:
* If you want a skill to let the same target be only selected once at a time,
* put <multipleDifferentTargets: x> instead (or additionally, as this won't make any
* difference. If multipleDifferentTargets is defined in a skill, multipleTargets
* will be ignored). You can choose between both options for each skill independently.
* The gameplay is as follows: Player can choose any different target until x targets
* are reached. If the player chooses a target he already chose before, no further targets
* can be chosen (even if number of chosen targets is below maximum choosable targets)
* but instead the attack will be initiated imediately. All chosen targets are hit once
* including the double chosen target. This is how a player can choose for example 2
* out of 3 targets if desired. If this sounds complicated, just try it. It makes a lot
* of sense to me. As the chosen targets are marked with a flag, it is an easy procedure.
*
* Additionally there is now the possibility to define a type of Malus for spreading
* an attack over multiple (different or not) Targets by defining up to two additional
* parameters.
*
* <mTMalusFactor: x> defines the factor uses for calculations dependent of the Malus type
* (see below). It can be a number, even floatingpoint. I like to use 1.5. 
* 
* <multipleTargetsMalusType: type> where type can be ONCE or LINEAR or EXPONENTIAL
*
* <multipleTargetsMalusType: ONCE> reduces damage (or positive effect power) by
* formula new damage = damage / mTMalusFactor, no matter on how many targets you cast
* the skill. (This appies only when selected more than 1 target.)
*
* <multipleTargetsMalusType: LINEAR> reduces damage (or positive effect power) by
* formula new damage = damage / number of targets
* this spreads an attack/positive effect evenly above all targets. The total
* damage over all enemies equals the damage if chosen only 1 target.
* (mTMalusFactor is not needed)
*
* <multipleTargetsMalusType: EXPONENTIAL> reduces damage (or positive effect power) by
* formula new damage = damage / (mTMalusFactor^(number of targets-1))
* this is the most interesting function as it offers some nice "secrets" about best
* usage of skills. If chosen factor 1.5 for example, the total damage increases up to
* if skill is casted on 2 or 3 enemies, but then constantly reduces if chosen more.
* it is higher than casting in 1 target up to the 5th target and afterwards it will be
* lower. So there is a kind of "perfect" number of enemies to target (if targeting one
* strong enemy to get rid of it as soon as possible is not even better). Choose different
* values and add a lot of leaning to the game to be a perfect fighter.
*
* All settings can be set for each skill individually!
* 
* -- mod end.
*
* If using the Indicators, they will not show up on Actors unless you've enabled
* side view in the System settings.
*
* License:
* If you use or modify this plugin, just attribute both Zevia and ST0RMTiger
* and you have to keep this information and the license conditions for the use of this plugin!
*
* @param shouldUseIndicators
* @text Use Selection Indicators
* @desc Whether target indicators appear over Sprites with each selection made
* @type boolean
* @default false
*
* @param gradients
* @text Color Gradients
* @desc These gradients are used, in order, for each selected target. Once all have been used, they'll start over.
* @type struct<GradientColor>[]
* @default ["{\"colorOne\":\"#E50027\",\"colorTwo\":\"#BF7300\"}","{\"colorOne\":\"#45E500\",\"colorTwo\":\"#12CA48\"}","{\"colorOne\":\"#007DE5\",\"colorTwo\":\"#0147CB\"}"]
*/
/*~struct~GradientColor:
* @param colorOne
* @text Color 1
* @desc The color for the top of an indicator triangle, as a hex value (format: #xxyyzz)
* @type String
*
* @param colorTwo
* @text Color 2
* @desc The color for the bottom of an indicator triangle, as a hex value (format: #xxyyzz)
* @type String
*/

const preventAttackTargetChange = true;

(function(module) {
    'use strict';

    // Polyfill for older versions of RPG Maker MV
    Array.prototype.find = Array.prototype.find || function(finderFunction) {
        for (var i = 0; i < this.length; i++) {
            var element = this[i];
            if (finderFunction(element, i, this)) { return element; }
        }
    };

    module.Zevia = module.Zevia || {};
    var TRIANGLE_WIDTH = 36;
    var SKILL_DATA_CLASS = 'skill';
    var parameters = PluginManager.parameters('SelectMultipleTargets');
    var gradients = JSON.parse(parameters.gradients);
    var shouldUseIndicators = parameters.shouldUseIndicators.match(/true/i);

    var Window_Indicator = module.Zevia.Window_Indicator = function() {
        this.initialize.apply(this, arguments);
    };

    // Here is the only function that changes between MV and MZ cause MZ wants a Rectangle and has another Window_Base (->Window_Selectable)
    Window_Indicator.prototype = Object.create(Window_Base.prototype);
    Window_Indicator.prototype.initialize = function(x, y, index) {
        this._indicators = [index];
        Window_Base.prototype.initialize.call(this, x, y, this.windowWidth(), this.windowHeight());
        this.contents.fontSize = 18;
        this.opacity = 0;
        this.refresh();
    };

    Window_Indicator.prototype.triangleWidth = function() {
        return TRIANGLE_WIDTH;
    };
    Window_Indicator.prototype.windowWidth = function() {
        return this._indicators.length * this.triangleWidth();
    };
    Window_Indicator.prototype.windowHeight = function() {
        return TRIANGLE_WIDTH - 5;
    };
    Window_Indicator.prototype.standardPadding = function() {
        return 0;
    };
    Window_Indicator.prototype.contentsWidth = function() {
        return Graphics.boxWidth;
    };
    Window_Indicator.prototype.contentsHeight = function() {
        return Graphics.boxHeight;
    };

    Window_Indicator.prototype.addIndicator = function(index) {
        this._indicators.push(index);
        this.move(this.x - (this.triangleWidth() / 4), this.y, this.windowWidth(), this.windowHeight());
        this.refresh();
    };

    Window_Indicator.prototype.drawTriangle = function(indicator, index) {
        var ctx = this.contents._context;
        var gradient = ctx.createLinearGradient(0, 0, 0, this.windowHeight());
        var colors = JSON.parse(gradients[(indicator - 1) % gradients.length]);
        gradient.addColorStop(0, colors.colorOne);
        gradient.addColorStop(0.6, colors.colorTwo);
        ctx.fillStyle = gradient;
        var x = (this.triangleWidth() / 2) * index;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + this.triangleWidth(), 0);
        ctx.lineTo(x + (this.triangleWidth() / 2), this.windowHeight());
        ctx.fill();
    };

    Window_Indicator.prototype.refresh = function() {
        this.contents.clear();
        this._indicators.forEach(function(indicator, index) {
            this.drawTriangle(indicator, index);
            var x = (this.triangleWidth() / 2) * index;
            this.drawText(
                indicator,
                (this.triangleWidth() / 2) * index,
                (this.windowHeight() / 2) - (this.lineHeight() / 2) - (this.contents.fontSize / 4),
                this.triangleWidth(),
                'center'
            );
        }.bind(this));
    };

    var SelectMultipleTargets = module.Zevia.MultipleTargets = {};

    SelectMultipleTargets.resetTargets = function() {
        BattleManager.inputtingAction()._multipleTargets = [];
        BattleManager.inputtingAction()._alreadyChosenMultipleTargets = [];
        SceneManager._scene.clearIndicators();
    };

    Scene_Battle.prototype.clearIndicators = function() {
        this._windowLayer.children = this._windowLayer.children.filter(function(child) {
            return !(child instanceof module.Zevia.Window_Indicator);
        });
        this._enemyIndicators = {};
        this._actorIndicators = {};
    };

    // --- Dealing with damage / effect strength acc. to selected target number
    // This is an override of a base function! As there are no subfunctions here.
    // Report eventual compatibility problems!
    Game_Action.prototype.evalDamageFormula = function(target) {
        try {
            const item = this.item();
            const a = this.subject(); // eslint-disable-line no-unused-vars
            const b = target; // eslint-disable-line no-unused-vars
            const v = $gameVariables._data; // eslint-disable-line no-unused-vars
            const sign = [3, 4].includes(item.damage.type) ? -1 : 1;
            var value = Math.max(eval(item.damage.formula), 0) * sign;

            // mod
            var divider = 1;
            if (typeof this._alreadyChosenMultipleTargets !== 'undefined') {
                divider = this._alreadyChosenMultipleTargets ? this._alreadyChosenMultipleTargets.length : 1;
            }
            const mTMalusFactor = (item.meta.mTMalusFactor && parseFloat(item.meta.mTMalusFactor.match(/\d+\.+\d*/)) || 0);
            if (mTMalusFactor >= 1) {
                var multipleTargetsMalusType = item.meta.multipleTargetsMalusType || 'NONE';
                if (multipleTargetsMalusType === 'EXPONENTIAL' || multipleTargetsMalusType === ' EXPONENTIAL') {
                    // EXPONENTIAL Malus
                    value = value / (Math.pow(mTMalusFactor,divider-1));
                } else if (multipleTargetsMalusType === 'LINEAR' || multipleTargetsMalusType === ' LINEAR') {
                    // LINEAR MALUS
                    value = value / divider;
                } else if (multipleTargetsMalusType === 'ONCE' || multipleTargetsMalusType === ' ONCE') {
                    // Reduce value ONCE, if more that 1 target but no matter how many targets
                    if (divider > 1) {value = value / mTMalusFactor;}
                } // else value stays unmodified
            } // else value stays unmodified
            // --- mod end


            return isNaN(value) ? 0 : value;
        } catch (e) {
            console.log(e);
            return 0;
        }
    };
    // ---

    Scene_Battle.prototype.okHandler = function(activeWindow, index) {
        var action = BattleManager.inputtingAction();
        action.setTarget(index);
        var isForFriend = action.isForFriend();
        var battleTarget = isForFriend ? $gameParty.battleMembers()[index] : $gameTroop.members()[index];
        
        var item = action._item;
        var ability = item._dataClass === SKILL_DATA_CLASS ? $dataSkills[item._itemId] : $dataItems[item._itemId];
        
        var multipleTargets = ability.meta.multipleTargets;
        var maxTargets = multipleTargets && parseInt(multipleTargets.match(/\d+/));

        var multipleDifferentTargets = ability.meta.multipleDifferentTargets;
        var maxDifferentTargets = multipleDifferentTargets && parseInt(multipleDifferentTargets.match(/\d+/));

        var alreadyChosen = false;
        if (index >= 0) {
            if(multipleDifferentTargets) {
                maxTargets = maxDifferentTargets;
                if ( typeof action._alreadyChosenMultipleTargets !== 'undefined' ) {
                    alreadyChosen = action._alreadyChosenMultipleTargets.includes((index));
                }
                if ( !alreadyChosen ) {
                    action._multipleTargets = (action._multipleTargets || []).concat(battleTarget);
                    action._alreadyChosenMultipleTargets = (action._alreadyChosenMultipleTargets || []).concat(index);
                }
            } else {
                action._multipleTargets = (action._multipleTargets || []).concat(battleTarget);
            }
        }
        if (alreadyChosen || !(multipleTargets||multipleDifferentTargets) || isNaN(maxTargets) || action._multipleTargets.length === maxTargets) {
            if (shouldUseIndicators) { this.clearIndicators(); }
            activeWindow.hide();
            this._skillWindow.hide();
            this._itemWindow.hide();
            console.log({...this});
            this.selectNextCommand();
            return;
        }

        activeWindow.activate();
        if (!shouldUseIndicators || (!$gameSystem.isSideView() && isForFriend)) { return; }

        var targetSprite = this._spriteset[(isForFriend ? '_actorSprites' : '_enemySprites')].find(function(sprite) {
            return sprite._battler.index() === index;
        });
        var indicators = isForFriend ? '_actorIndicators' : '_enemyIndicators';
        var indicatorWindow = this[indicators][index];
        if (indicatorWindow) {
            indicatorWindow.addIndicator(action._multipleTargets.length);
        } else {
            var mainSprite = isForFriend ? targetSprite._mainSprite : targetSprite;
            indicatorWindow = new module.Zevia.Window_Indicator(
                targetSprite.x - (TRIANGLE_WIDTH / 2),
                targetSprite.y - mainSprite.height - TRIANGLE_WIDTH,
                action._multipleTargets.length
            );
            this[indicators][index] = indicatorWindow;
            this.addWindow(indicatorWindow);
        }
    };

    SelectMultipleTargets.initializeBattle = Scene_Battle.prototype.initialize;
    Scene_Battle.prototype.initialize = function() {
        this._enemyIndicators = {};
        this._actorIndicators = {};
        SelectMultipleTargets.initializeBattle.call(this);
    };

    SelectMultipleTargets.onEnemyOk = Scene_Battle.prototype.onEnemyOk;
    Scene_Battle.prototype.onEnemyOk = function() {
        this.okHandler.call(this, this._enemyWindow, this._enemyWindow.enemyIndex());
    };

    SelectMultipleTargets.onActorOk = Scene_Battle.prototype.onActorOk;
    Scene_Battle.prototype.onActorOk = function() {
        this.okHandler.call(this, this._actorWindow, this._actorWindow.index());
    };

    SelectMultipleTargets.onActorCancel = Scene_Battle.prototype.onActorCancel;
    Scene_Battle.prototype.onActorCancel = function() {
        SelectMultipleTargets.onActorCancel.call(this);
        SelectMultipleTargets.resetTargets();
    };

    SelectMultipleTargets.onEnemyCancel = Scene_Battle.prototype.onEnemyCancel;
    Scene_Battle.prototype.onEnemyCancel = function() {
        SelectMultipleTargets.onEnemyCancel.call(this);
        SelectMultipleTargets.resetTargets();
    };

    SelectMultipleTargets.changeActor = BattleManager.changeActor;
    BattleManager.changeActor = function(newActorIndex, lastActorActionState) {
        var previousActor = $gameParty.members()[newActorIndex];
        if (previousActor) {
            previousActor._actions.forEach(function(action) {
                action._multipleTargets = [];
            });
        }
        SelectMultipleTargets.changeActor.call(BattleManager, newActorIndex, lastActorActionState);
    };

    Game_Action.prototype.confirmTargets = function() {
        var isForDeadFriend = this.isForDeadFriend();
        var isForFriend = this.isForFriend();
        var item = this.item();
        var ability = item._dataClass === SKILL_DATA_CLASS ? $dataSkills[item._itemId] : $dataItems[item._itemId];
        for (var i = 0; i < this._multipleTargets.length; i++) {
            if (!isForDeadFriend && this._multipleTargets[i].isDead()) {
                if (isForFriend) {
                    this._multipleTargets[i] = $gameParty.randomTarget();
                } else {
                    this._multipleTargets[i] = $gameTroop.randomTarget();
                }
            } else if (isForDeadFriend && !this._multipleTargets[i].isDead()) {
                this._multipleTargets[i] = $gameParty.randomDeadTarget();
            }
        }
        return this._multipleTargets;
    };

    SelectMultipleTargets.targetsForOpponents = Game_Action.prototype.targetsForOpponents;
    Game_Action.prototype.targetsForOpponents = function() {
        if (this._multipleTargets && this._multipleTargets.length > 1) { return this.confirmTargets(); }
        return SelectMultipleTargets.targetsForOpponents.call(this);
    };

    SelectMultipleTargets.targetsForFriends = Game_Action.prototype.targetsForFriends;
    Game_Action.prototype.targetsForFriends = function() {
        if (this._multipleTargets && this._multipleTargets.length > 1) { return this.confirmTargets(); }
        return SelectMultipleTargets.targetsForFriends.call(this);
    };
})(window);

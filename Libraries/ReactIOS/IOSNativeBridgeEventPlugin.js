/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule IOSNativeBridgeEventPlugin
 */

"use strict";

var EventPropagators = require('EventPropagators');
var NativeModules = require('NativeModules');
var SyntheticEvent = require('SyntheticEvent');

var merge = require('merge');
var warning = require('warning');

var RCTUIManager = NativeModules.RCTUIManager;

var customBubblingEventTypes = RCTUIManager.customBubblingEventTypes;
var customDirectEventTypes = RCTUIManager.customDirectEventTypes;

var allTypesByEventName = {};

for (var bubblingTypeName in customBubblingEventTypes) {
  allTypesByEventName[bubblingTypeName] = customBubblingEventTypes[bubblingTypeName];
}

for (var directTypeName in customDirectEventTypes) {
  warning(
    !customBubblingEventTypes[directTypeName],
    "Event cannot be both direct and bubbling: %s",
    directTypeName
  );
  allTypesByEventName[directTypeName] = customDirectEventTypes[directTypeName];
}

var IOSNativeBridgeEventPlugin = {

  eventTypes: merge(customBubblingEventTypes, customDirectEventTypes),

  /**
   * @param {string} topLevelType Record from `EventConstants`.
   * @param {DOMEventTarget} topLevelTarget The listening component root node.
   * @param {string} topLevelTargetID ID of `topLevelTarget`.
   * @param {object} nativeEvent Native browser event.
   * @return {*} An accumulation of synthetic events.
   * @see {EventPluginHub.extractEvents}
   */
  extractEvents: function(
      topLevelType,
      topLevelTarget,
      topLevelTargetID,
      nativeEvent) {
    var bubbleDispatchConfig = customBubblingEventTypes[topLevelType];
    var directDispatchConfig = customDirectEventTypes[topLevelType];
    var event = SyntheticEvent.getPooled(
      bubbleDispatchConfig || directDispatchConfig,
      topLevelTargetID,
      nativeEvent
    );
    if (bubbleDispatchConfig) {
      EventPropagators.accumulateTwoPhaseDispatches(event);
    } else if (directDispatchConfig) {
      EventPropagators.accumulateDirectDispatches(event);
    } else {
      return null;
    }
    return event;
  }
};

module.exports = IOSNativeBridgeEventPlugin;


/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule WebView
 */
'use strict';

var EdgeInsetsPropType = require('EdgeInsetsPropType');
var React = require('React');
var ReactIOSViewAttributes = require('ReactIOSViewAttributes');
var StyleSheet = require('StyleSheet');
var View = require('View');

var createReactIOSNativeComponentClass = require('createReactIOSNativeComponentClass');
var keyMirror = require('keyMirror');
var insetsDiffer = require('insetsDiffer');
var merge = require('merge');

var PropTypes = React.PropTypes;
var { RCTWebViewManager } = require('NativeModules');

var RCT_WEBVIEW_REF = 'webview';

var WebViewState = keyMirror({
  IDLE: null,
  LOADING: null,
  ERROR: null,
});

var NavigationType = {
  click: RCTWebViewManager.NavigationType.LinkClicked,
  formsubmit: RCTWebViewManager.NavigationType.FormSubmitted,
  backforward: RCTWebViewManager.NavigationType.BackForward,
  reload: RCTWebViewManager.NavigationType.Reload,
  formresubmit: RCTWebViewManager.NavigationType.FormResubmitted,
  other: RCTWebViewManager.NavigationType.Other,
};

var WebView = React.createClass({
  statics: {
    NavigationType: NavigationType,
  },

  propTypes: {
    renderErrorView: PropTypes.func.isRequired, // view to show if there's an error
    renderLoadingView: PropTypes.func.isRequired, // loading indicator to show
    url: PropTypes.string.isRequired,
    automaticallyAdjustContentInsets: PropTypes.bool,
    shouldInjectAJAXHandler: PropTypes.bool,
    contentInset: EdgeInsetsPropType,
    onNavigationStateChange: PropTypes.func,
    startInLoadingState: PropTypes.bool, // force WebView to show loadingView on first load
    style: View.propTypes.style,
  },

  getInitialState: function() {
    return {
      viewState: WebViewState.IDLE,
      lastErrorEvent: null,
      startInLoadingState: true,
    };
  },

  componentWillMount: function() {
    if (this.props.startInLoadingState) {
      this.setState({viewState: WebViewState.LOADING});
    }
  },

  render: function() {
    var otherView = null;

   if (this.state.viewState === WebViewState.LOADING) {
      otherView = this.props.renderLoadingView();
    } else if (this.state.viewState === WebViewState.ERROR) {
      var errorEvent = this.state.lastErrorEvent;
      otherView = this.props.renderErrorView(
        errorEvent.domain,
        errorEvent.code,
        errorEvent.description);
    } else if (this.state.viewState !== WebViewState.IDLE) {
      console.error('RCTWebView invalid state encountered: ' + this.state.loading);
    }

    var webViewStyles = [styles.container, this.props.style];
    if (this.state.viewState === WebViewState.LOADING ||
      this.state.viewState === WebViewState.ERROR) {
      // if we're in either LOADING or ERROR states, don't show the webView
      webViewStyles.push(styles.hidden);
    }

    var webView =
      <RCTWebView
        ref={RCT_WEBVIEW_REF}
        key="webViewKey"
        style={webViewStyles}
        url={this.props.url}
        shouldInjectAJAXHandler={this.props.shouldInjectAJAXHandler}
        contentInset={this.props.contentInset}
        automaticallyAdjustContentInsets={this.props.automaticallyAdjustContentInsets}
        onLoadingStart={this.onLoadingStart}
        onLoadingFinish={this.onLoadingFinish}
        onLoadingError={this.onLoadingError}
      />;

    return (
      <View style={styles.container}>
        {webView}
        {otherView}
      </View>
    );
  },

  goForward: function() {
    RCTWebViewManager.goForward(this.getWebWiewHandle());
  },

  goBack: function() {
    RCTWebViewManager.goBack(this.getWebWiewHandle());
  },

  reload: function() {
    RCTWebViewManager.reload(this.getWebWiewHandle());
  },

  /**
   * We return an event with a bunch of fields including:
   *  url, title, loading, canGoBack, canGoForward
   */
  updateNavigationState: function(event) {
    if (this.props.onNavigationStateChange) {
      this.props.onNavigationStateChange(event.nativeEvent);
    }
  },

  getWebWiewHandle: function() {
    return this.refs[RCT_WEBVIEW_REF].getNodeHandle();
  },

  onLoadingStart: function(event) {
    this.updateNavigationState(event);
  },

  onLoadingError: function(event) {
    event.persist(); // persist this event because we need to store it
    console.error("encountered an error loading page", event.nativeEvent);

    this.setState({
      lastErrorEvent: event.nativeEvent,
      viewState: WebViewState.ERROR
    });
  },

  onLoadingFinish: function(event) {
    this.setState({
      viewState: WebViewState.IDLE,
    });
    this.updateNavigationState(event);
  },
});

var RCTWebView = createReactIOSNativeComponentClass({
  validAttributes: merge(ReactIOSViewAttributes.UIView, {
    url: true,
    contentInset: {diff: insetsDiffer},
    automaticallyAdjustContentInsets: true,
    shouldInjectAJAXHandler: true
  }),
  uiViewClassName: 'RCTWebView',
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hidden: {
    height: 0,
    flex: 0, // disable 'flex:1' when hiding a View
  },
});

module.exports = WebView;

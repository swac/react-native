/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule XMLHttpRequest
 * @flow
 */
'use strict';

var RCTDataManager = require('NativeModules').RCTDataManager;

var crc32 = require('crc32');

class XMLHttpRequest {

  UNSENT: number;
  OPENED: number;
  HEADERS_RECEIVED: number;
  LOADING: number;
  DONE: number;

  onreadystatechange: ?Function;
  onload: ?Function;
  upload: any;
  readyState: number;
  responseHeaders: ?Object;
  responseText: ?string;
  status: ?string;

  _method: ?string;
  _url: ?string;
  _headers: Object;
  _sent: boolean;
  _aborted: boolean;

  constructor() {
    this.UNSENT = 0;
    this.OPENED = 1;
    this.HEADERS_RECEIVED = 2;
    this.LOADING = 3;
    this.DONE = 4;

    this.onreadystatechange = undefined;
    this.upload = undefined; /* Upload not supported */
    this.readyState = this.UNSENT;
    this.responseHeaders = undefined;
    this.responseText = undefined;
    this.status = undefined;

    this._method = null;
    this._url = null;
    this._headers = {};
    this._sent = false;
    this._aborted = false;
  }

  getAllResponseHeaders(): ?string {
    /* Stub */
    return '';
  }

  getResponseHeader(header: string): ?string {
    /* Stub */
    return '';
  }

  setRequestHeader(header: string, value: any): void {
    this._headers[header] = value;
  }

  open(method: string, url: string, async: ?boolean): void {
    /* Other optional arguments are not supported */
    if (this.readyState !== this.UNSENT) {
      throw new Error('Cannot open, already sending');
    }
    if (async !== undefined && !async) {
      // async is default
      throw new Error('Synchronous http requests are not supported');
    }
    this._method = method;
    this._url = url;
    this._aborted = false;
    this._setReadyState(this.OPENED);
  }

  send(data: any): void {
    if (this.readyState !== this.OPENED) {
      throw new Error('Request has not been opened');
    }
    if (this._sent) {
      throw new Error('Request has already been sent');
    }
    this._sent = true;

    RCTDataManager.queryData(
      'http',
      JSON.stringify({
        method: this._method,
        url: this._url,
        data: data,
        headers: this._headers,
      }),
      'h' + crc32(this._method + '|' + this._url + '|' + data),
      (result) => {
        result = JSON.parse(result);
        this._callback(result.status, result.responseHeaders, result.responseText);
      }
    );
  }

  abort(): void {
    console.warn(
      'XMLHttpRequest: abort() cancels JS callbacks ' +
      'but not native HTTP request.'
    );
    // only call onreadystatechange if there is something to abort,
    // below logic is per spec
    if (!(this.readyState === this.UNSENT ||
        (this.readyState === this.OPENED && !this._sent) ||
        this.readyState === this.DONE)) {
      this._sent = false;
      this._setReadyState(this.DONE);
    }
    if (this.readyState === this.DONE) {
      this._sendLoad();
    }
    this.readyState = this.UNSENT;
    this._aborted = true;
  }

  _setReadyState(newState: number): void {
    this.readyState = newState;
    // TODO: workaround flow bug with nullable function checks
    var onreadystatechange = this.onreadystatechange;
    if (onreadystatechange) {
      // We should send an event to handler, but since we don't process that
      // event anywhere, let's leave it empty
      onreadystatechange(null);
    }
  }

  _sendLoad(): void {
    // TODO: workaround flow bug with nullable function checks
    var onload = this.onload;
    if (onload) {
      // We should send an event to handler, but since we don't process that
      // event anywhere, let's leave it empty
      onload(null);
    }
  }

  _callback(status: string, responseHeaders: ?Object, responseText: string): void {
    if (this._aborted) {
      return;
    }
    this.status = status;
    this.responseHeaders = responseHeaders;
    this.responseText = responseText;
    this._setReadyState(this.DONE);
    this._sendLoad();
  }
}

module.exports = XMLHttpRequest;

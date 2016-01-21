/*global require, exports, Promise, Error, WebSocket*/
/**
 * @requires montage:core/target
 */
var Target = require("montage/core/target").Target;


/**
 * @class
 * @extend Target
 *
 * @classdesc Montage Class that allow to establish a continuous full-duplex
 * connection stream between a client and a server.
 *
 */
var WebSocketClient = exports.WebSocketClient = Target.specialize({


    /*------------------------------------------------------------------------------------------------------------------
                                                        Properties
     -----------------------------------------------------------------------------------------------------------------*/


    /**
     * @type {Object}
     * @public
     * @default null
     *
     * @description todo
     *
     */
    delegate: {
        value: null
    },


    /**
     * @type {String}
     * @private
     * @default null
     *
     * @see url
     *
     */
    _url: {
        value: null
    },


    /**
     * @type {String}
     * @public
     * @default null
     *
     * @description The URL to which to connect.
     *
     */
    url: {
        set: function (url) {
            //TODO: better url checking.
            if (typeof url === "string" && url.length && this._url !== url) {
                this._url = url;
            }
        },
        get: function () {
            return this._url;
        }
    },


    /**
     * @type {Array}
     * @private
     * @default null
     *
     * @see _pendingMessages
     *
     */
    __pendingMessages: {
        value: null
    },


    /**
     * @type {Array}
     * @public
     * @default null
     *
     * @description Array that stores pending message.
     * Used when trying to send message when we are opening the connection.
     *
     */
    _pendingMessages: {
        get: function () {
            if (!this.__pendingMessages) {
                this.__pendingMessages = [];
            }

            return this.__pendingMessages;
        }
    },


    /**
     * @type {Boolean}
     * @private
     * @default false
     *
     * @see isConnecting
     *
     */
    _isConnecting: {
        value: false
    },


    /**
     * @type {Boolean}
     * @public
     * @default false
     * @readOnly
     *
     * @description Boolean that indicates if the connection is not yet open.
     *
     */
    isConnecting: {
        get: function () {
            return this._isConnecting;
        }
    },


    /**
     * @type {Array}
     * @public
     * @default null
     *
     * @description An array of strings indicating the name of the sub-protocol.
     *
     */
    protocols: {
        value: null
    },


    /**
     * @type {Object}
     * @public
     * @default null
     *
     * @description todo
     *
     */
    binaryType: {
        value: null
    },


    /**
     * @type {Number}
     * @private
     * @default responseType
     *
     * @see todo
     *
     */
    _responseType: {
        value: null
    },


    /**
     * @type {Number}
     * @public
     * @default null
     *
     * @description todo
     *
     */
    responseType: {
        set: function (response) {
            if (response === "json" || WebSocketClient.RESPONSE_TYPE.JSON) {
                this._responseType = WebSocketClient.RESPONSE_TYPE.JSON;

            } else if (response === "string" || WebSocketClient.RESPONSE_TYPE.STRING) {
                this._responseType = WebSocketClient.RESPONSE_TYPE.STRING;

            } else if (response === "binary" || WebSocketClient.RESPONSE_TYPE.BINARY) {
                this._responseType = WebSocketClient.RESPONSE_TYPE.BINARY;
            }
        },
        get: function () {
            return this._responseType;
        }
    },


    /**
     * @type {Number}
     * @public
     * @default 1
     *
     * @description todo
     *
     */
    maxConnectionAttempt: {
        value: 1
    },


    /**
     * @type {Number}
     * @public
     * @default 2000
     *
     * @description todo
     *
     */
    reconnectInterval: {
        value: 2000 // -> 2s
    },


    /**
     * @type {Boolean}
     * @public
     * @default false
     * @readOnly
     *
     * @description Boolean that indicates if the connection is opened.
     *
     */
    isConnected: {
        get: function () {
            return this._socket.readyState === WebSocket.OPEN;
        }
    },


    /*------------------------------------------------------------------------------------------------------------------
                                                 Public Functions
     -----------------------------------------------------------------------------------------------------------------*/


    /**
     * @function
     * @public
     *
     * @description Initialize a WebSocketClient Object with the URL of the server.
     *
     * @params {String} url - The URL to which to connect.
     *
     * @return {Object.<WebSocketClient>}
     *
     */
    initWithUrl: {
        value: function (url) {
            this.url = url;

            return this;
        }
    },


    /**
     * @function
     * @public
     *
     * @description Establishes a WebSocket connection with a server.
     *
     * @returns {Promise}
     *
     */
    connect: {
        value: function () {
            if (!this._isConnecting) {
                this._isConnecting = true;

                if (this._socket) {
                    this.disconnect();
                }

                if (typeof this.url === "string" && this.url.length) {
                    var self = this;

                    return new Promise(function (resolve, reject) {
                        self._connect(resolve, reject);
                    });
                }

                return Promise.reject("WebSocket url is not valid");
            }

            return Promise.reject("WebSocketClient is already connecting");
        }
    },


    /**
     * @function
     * @public
     *
     * @description re-connect with a server.
     *
     * @returns {Promise}
     *
     */
    reConnect: {
        value: function () {
            if (this._socket) {
                this.disconnect();
            }

            return this.connect();
        }
    },


    /**
     * @function
     * @public
     *
     * @description Close the connection with a server and clear the pending messages.
     *
     * @params {Number} code.
     * @params {String} reason.
     *
     */
    disconnect: {
        value: function (code, reason) {
            if (this._socket) {
                if (this._socket.readyState !== WebSocket.CLOSED) {
                    this._socket.close(code, reason); // If already closed, will do nothing.
                }

                this._clearPendingMessages();

                this._socket = null;
                this._isConnecting = false;
            }
        }
    },


    /**
     * @function
     * @public
     *
     * @description Send a message to the server through the established connection.
     *
     * @params {Object} message.
     *
     */
    sendMessage: {
        value: function (message) {
            var socket = this._socket;

            if (socket && socket.readyState == WebSocket.OPEN) {
                this._sendMessage(message);

            } else if (socket && socket.readyState == WebSocket.CONNECTING) {
                this._addPendingMessage(message);

            } else {
                var self = this;

                this.connect().then(function () {
                    self._sendMessage(message);

                }, function (error) {
                    self.dispatchEventNamed("webSocketError", true, true, error);
                });
            }
        }
    },


    /*------------------------------------------------------------------------------------------------------------------
                                                Private Functions
     -----------------------------------------------------------------------------------------------------------------*/


    /**
     * @function
     * @private
     *
     * @description todo
     *
     * @params {Function} resolve.
     * @params {Function} reject.
     * @params {Number} _currentAttempt.
     *
     */
    _connect: {
        value: function (resolve, reject, _currentAttempt) {
            /**
             * This condition is needed while creating a new WebSocket Object
             * otherwise an error is raised if the protocols argument is equal to null, undefined...
             */
            var socket = this._socket = !this.protocols ?
                new WebSocket(this.url) : new WebSocket(this.url, this.protocols),

                self = this;

            _currentAttempt = _currentAttempt || 1;

            socket.onerror = function (event) {
                if (self._isConnecting) {
                    if (++_currentAttempt <= self.maxConnectionAttempt) {
                        console.log(_currentAttempt);

                        setTimeout(function () {
                            self._connect(resolve, reject, _currentAttempt);
                        }, _currentAttempt * self.reconnectInterval);
                    } else {
                        var state = socket.readyState;

                        if ((state === WebSocket.CLOSING || state === WebSocket.CLOSED)) {
                            reject(new Error("WebSocket connection failed"));

                        } else {
                            reject(event);
                        }

                        self.disconnect();
                    }
                } else {
                    self.dispatchEventNamed("webSocketError", true, true, event);
                }
            };

            socket.onopen = function (event) {
                self._isConnecting = false;

                if (this.__pendingMessages) {
                    var message;

                    while (this.__pendingMessages.length) {
                        message = this.__pendingMessages.pop();

                        self._sendMessage(message);
                    }
                }

                self._startListenToMessage();

                self.dispatchEventNamed("webSocketOpen", true, true, event);

                resolve(event);
            };
        }
    },


    /**
     * @function
     * @private
     *
     * @description Add a pending message.
     *
     * @params {Object} message
     *
     */
    _addPendingMessage: {
        value: function (message) {
            this._pendingMessages.push(message);
        }
    },


    /**
     * @function
     * @private
     *
     * @description todo
     *
     */
    _clearPendingMessages: {
        value: function () {
            if (this.__pendingMessages) {
                while (this.__pendingMessages.length) {
                    this.__pendingMessages.pop();
                }
            }
        }
    },


    /**
     * @function
     * @private
     *
     * @description todo
     *
     */
    _startListenToMessage: {
        value: function () {
            var self = this,
                socket = this._socket;

            socket.onmessage = function (messageEvent) {
                var data = messageEvent.data,
                    response = self.callDelegateMethod("webSocketWillParseResponse", self, data),
                    errorResponse;

                if (response === void 0) {
                    if (self._responseType === WebSocketClient.RESPONSE_TYPE.JSON) {
                        try {
                            response = JSON.parse(data);

                        } catch (error) {
                            errorResponse = error;
                        }
                    } else {
                        //todo other types
                        response = data;
                    }

                    self.callDelegateMethod("webSocketDidParseResponse", self, response);
                }

                if (errorResponse) {
                    self.dispatchEventNamed("webSocketError", true, true, errorResponse);

                } else {
                    self.dispatchEventNamed("webSocketMessage", true, true, response);
                }
            };

            socket.onclose = function (closeEvent) {
                self.dispatchEventNamed("webSocketClose", true, true, closeEvent);

                self.disconnect();
            };
        }
    },


    /**
     * @function
     * @private
     *
     * @description todo
     *
     * @params {Object} message
     *
     */
    _sendMessage: {
        value: function (message) {
            var messageFromDelegate = this.callDelegateMethod("webSocketWillSendMessage", this, message);

            this._socket.send(messageFromDelegate || message);
        }
    }


}, {

    RESPONSE_TYPE: {
        value: {
            STRING: 0,
            JSON: 1,
            BINARY: 2
        }
    }

});

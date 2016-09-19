/**
 * @copyright Maichong Software Ltd. 2016 http://maichong.it
 * @date 2016-04-06
 * @author Liang <liang@maichong.it>
 */

'use strict';

const Create = require('alaska-log/sleds/Create').default;
const pathToRegexp = require('path-to-regexp');
const _ = require('lodash');

module.exports = function (options) {
  let ignore = null;

  function convert(input) {
    if (typeof input === 'string') {
      ignore.push(pathToRegexp(input));
    } else if (input.test) {
      ignore.push(input);
    } else if (input instanceof Function) {
      ignore.push(input);
    }
  }

  if (options && options.ignore) {
    ignore = [];

    if (Array.isArray(options.ignore)) {
      options.ignore.forEach(convert);
    } else {
      convert(options.ignore);
    }
  }
  return function logMiddleware(ctx, next) {
    if (ignore) {
      for (let reg of ignore) {
        if (reg.test) {
          if (reg.test(ctx.path)) return next();
        } else if (reg(ctx)) {
          return next();
        }
      }
    }
    let start = Date.now();

    function log() {
      let time = Date.now() - start;
      let status = ctx.status;
      let level = 'info';
      switch (status) {
        case 404:
        case 403:
          level = 'warning';
          break;
        case 400:
        case 500:
          level = 'error';
          break;
      }
      let details = {};
      if (options.headers && typeof Array.isArray(options.headers)) {
        details.headers = _.pick(ctx.headers, options.headers);
      } else if (options.headers === true) {
        details.headers = options.headers;
      } else {
        details = undefined;
      }
      Create.run({
        title: ctx.url,
        type: 'http',
        method: ctx.method,
        level,
        ip: ctx.ip,
        status,
        length: ctx.length,
        time,
        details
      });
    }

    return next().then(log, log);
  };
};

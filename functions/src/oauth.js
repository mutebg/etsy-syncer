const request = require("request");
const OAuth = require("oauth");

// Specialized error
class HttpError extends Error {
  constructor(message, statusCode, headers) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) {
        super();
      }
      let thisFn = (() => {
        this;
      }).toString();
      let thisName = thisFn
        .slice(thisFn.indexOf("{") + 1, thisFn.indexOf(";"))
        .trim();
      eval(`${thisName} = this;`);
    }
    this.message = message;
    this.statusCode = statusCode;
    this.headers = headers;
  }
}

class Client {
  constructor(options) {
    this.options = options;
    this.apiKey = this.options.key;
    this.apiSecret = this.options.secret;
    this.callbackURL = this.options.callbackURL;
    this.scope = this.options.scope;

    if (!this.scope) {
      this.scope = "email_r%20profile_r%20profile_w%20address_r%20address_w";
    }

    this.request = request;
    this.etsyOAuth = new OAuth.OAuth(
      `https://openapi.etsy.com/v2/oauth/request_token?scope=${this.scope}`,
      "https://openapi.etsy.com/v2/oauth/access_token",
      `${this.apiKey}`,
      `${this.apiSecret}`,
      "1.0",
      `${this.callbackURL}`,
      "HMAC-SHA1"
    );
  }

  // nice helper method to set token and secret for each method call
  // client().auth('myToken', 'mySecret').me().find()
  auth(token, secret) {
    this.authenticatedToken = token;
    this.authenticatedSecret = secret;
    return this;
  }

  buildUrl(path, pageOrQuery = null) {
    let query;
    if (path == null) {
      path = "/";
    }
    if (pageOrQuery != null && typeof pageOrQuery === "object") {
      query = pageOrQuery;
      if (this.apiKey != null && this.apiSecret == null) {
        query.api_key = this.apiKey;
      }
    } else {
      query = {};
    }

    if (this.apiKey != null && this.apiSecret == null) {
      query.api_key = this.apiKey;
    }
    const _url = require("url").format({
      protocol: "https:",
      hostname: "openapi.etsy.com",
      pathname: `/v2${path}`,
      query
    });

    console.dir(`API URL is ${_url} `);
    return _url;
  }

  handleResponse(res, body, callback) {
    if (Math.floor(res.statusCode / 100) === 5) {
      return callback(
        new HttpError(`Error ${res.statusCode}`, res.statusCode, res.headers)
      );
    }
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch (err) {
        console.log(`Error parsing response: ${body}`);
        return callback(err);
      }
    }
    if (
      body.message &&
      [400, 401, 403, 404, 410, 422].includes(res.statusCode)
    ) {
      return callback(new HttpError(body.message, res.statusCode, res.headers));
    }

    //    console.log util.inspect body.results
    return callback(null, res.statusCode, body, res.headers);
  }

  // api GET requests
  get(path, ...rest) {
    const adjustedLength = Math.max(rest.length, 1),
      params = rest.slice(0, adjustedLength - 1),
      callback = rest[adjustedLength - 1];
    console.log(`==> Client get request with params ${params}`);
    if (this.authenticatedToken != null && this.authenticatedSecret != null) {
      return this.getAuthenticated(path, ...Array.from(params), callback);
    } else {
      return this.getUnauthenticated(path, ...Array.from(params), callback);
    }
  }

  // api PUT requests
  put(path, content, callback) {
    const url = this.buildUrl(path);
    console.log(
      `==> Perform PUT request on ${url} with ${JSON.stringify(content)}`
    );
    return this.etsyOAuth.put(
      url,
      this.authenticatedToken,
      this.authenticatedSecret,
      content,
      (err, data, res) => {
        if (err) {
          return callback(err);
        }
        return this.handleResponse(res, data, callback);
      }
    );
  }

  // api POST requests
  post(path, content, callback) {
    const url = this.buildUrl(path);
    console.log(
      `==> Perform POST request on ${url} with ${JSON.stringify(content)}`
    );
    return this.etsyOAuth.post(
      url,
      this.authenticatedToken,
      this.authenticatedSecret,
      content,
      (err, data, res) => {
        if (err) {
          return callback(err);
        }
        return this.handleResponse(res, data, callback);
      }
    );
  }

  // api DELETE requests
  delete(path, callback) {
    const url = this.buildUrl(path);
    console.log(`==> Perform DELETE request on ${url}`);
    return this.etsyOAuth.delete(
      url,
      this.authenticatedToken,
      this.authenticatedSecret,
      (err, data, res) => {
        if (err) {
          return callback(err);
        }
        return this.handleResponse(res, data, callback);
      }
    );
  }

  getUnauthenticated(path, ...rest) {
    const adjustedLength = Math.max(rest.length, 1),
      params = rest.slice(0, adjustedLength - 1),
      callback = rest[adjustedLength - 1];
    console.log("==> Perform unauthenticated GET request");
    return this.request(
      {
        uri: this.buildUrl(path, ...Array.from(params)),
        method: "GET"
      },
      (err, res, body) => {
        if (err) {
          return callback(err);
        }
        return this.handleResponse(res, body, callback);
      }
    );
  }

  getAuthenticated(path, ...rest) {
    const adjustedLength = Math.max(rest.length, 1),
      params = rest.slice(0, adjustedLength - 1),
      callback = rest[adjustedLength - 1];
    const url = this.buildUrl(path, ...Array.from(params));
    console.log(`==> Perform authenticated GET request on ${url}`);
    return this.etsyOAuth.get(
      url,
      this.authenticatedToken,
      this.authenticatedSecret,
      (err, data, res) => {
        if (err) {
          return callback(err);
        }
        return this.handleResponse(res, data, callback);
      }
    );
  }

  requestToken(callback) {
    return this.etsyOAuth.getOAuthRequestToken(function(
      err,
      oauth_token,
      oauth_token_secret
    ) {
      console.log("==> Retrieving the request token");
      if (err) {
        return callback(err);
      }
      const loginUrl = arguments[3].login_url;
      const auth = {
        token: oauth_token,
        tokenSecret: oauth_token_secret,
        loginUrl
      };
      return callback(null, auth);
    });
  }

  accessToken(token, secret, verifier, callback) {
    return this.etsyOAuth.getOAuthAccessToken(token, secret, verifier, function(
      err,
      oauth_access_token,
      oauth_access_token_secret,
      results
    ) {
      console.log("==> Retrieving the access token");
      const accessToken = {
        token: oauth_access_token,
        tokenSecret: oauth_access_token_secret
      };

      return callback(null, accessToken);
    });
  }
}

module.exports.client = (apiKey, options) => new Client(apiKey, options);

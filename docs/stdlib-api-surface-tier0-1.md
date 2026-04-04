# Standard Library API Surface -- Tier 0 Extensions and Tier 1

**Date:** 2026-04-04
**Status:** Forward-looking design specification
**Audience:** Research review teams T1-T8
**Syntax profile:** 56-character default

---

## Purpose

This document specifies the API surface for Tier 0 extension modules and Tier 1 standard library modules in toke's 56-character default syntax. Each module is presented as a `.tki` interface -- the type definitions and function signatures that constitute the module's public contract.

This is a **design specification**, not an implementation. Its purpose is to demonstrate that the 56-character syntax handles real-world API design gracefully: HTTP routing, authentication, WebSocket communication, template rendering, and streaming JSON -- not just toy programs.

All signatures follow the normative grammar from `toke-spec-v02.md` Section 10. Types use the `$` sigil. Collections use `@`. Error returns use the `!$errtype` suffix. Semicolons terminate every declaration.

References:
- Language specification: `toke/spec/spec/toke-spec-v02.md`
- Existing Tier 0 stdlib signatures: spec Section 16
- Design decisions: `toke-spec/docs/design-decisions.md`

---

## Tier 0 -- Foundation Extensions

These modules extend the existing Tier 0 standard library (`std.json`, `std.http`, `std.crypto`) with capabilities required for production use.

---

### 1. std.json (extensions)

The base `std.json` module (spec Section 16.4) provides `json.enc`, `json.dec`, and field accessors. These extensions add streaming, validation, JSON Pointer (RFC 6901), and JSON Patch (RFC 6902).

#### .tki interface

```
m=std.json;

t=$jsonstream{parser:str;done:bool};
t=$jsonschema{raw:str};
t=$patchop{op:str;path:str;value:$json};

t=$jsonstreamerr{
  Truncated:str;
  Malformed:str;
  IO:str
};

t=$jsonpatcherr{
  BadPath:str;
  BadOp:str;
  TestFailed:str
};

f=json.streamparse(reader:$reader):$jsonstream!$jsonstreamerr;
f=json.streamemit(writer:$writer;val:$json):void!$jsonstreamerr;
f=json.validate(val:$json;schema:$jsonschema):bool!$jsonerr;
f=json.pointer(val:$json;path:str):$json!$jsonerr;
f=json.patch(val:$json;ops:@$patchop):$json!$jsonpatcherr;
```

#### Usage example

```
i=json:std.json;

let doc=json.dec(raw)!$apperr.Parse;
let name=json.pointer(doc;"/user/name")!$apperr.Parse;
let patched=json.patch(doc;@($patchop{op:"replace";path:"/user/active";value:json.enc("true")}))!$apperr.Patch;
```

#### Sum types

- `$jsonstreamerr` -- sum type: error variants for streaming parse failures
- `$jsonpatcherr` -- sum type: error variants for JSON Patch operations
- `$jsonerr` -- sum type (from base module): `Parse`, `Type`, `Missing`

---

### 2. std.http (client extensions)

The base `std.http` module (spec Section 16.2) provides server-side request/response types and route registration. These extensions add an HTTP client with connection pooling.

#### .tki interface

```
m=std.http;

t=$reqopts{
  method:str;
  url:str;
  headers:@(@str);
  body:str;
  timeoutms:u32
};

t=$poolconfig{
  maxconns:u32;
  idletimeoutms:u32;
  tlsverify:bool
};

t=$connpool{id:u64;active:u32};

t=$clienterr{
  Timeout:u32;
  Refused:str;
  DNS:str;
  TLS:str;
  Status:u16
};

f=http.get(url:str):$res!$clienterr;
f=http.post(url:str;body:str):$res!$clienterr;
f=http.put(url:str;body:str):$res!$clienterr;
f=http.delete(url:str):$res!$clienterr;
f=http.request(opts:$reqopts):$res!$clienterr;
f=http.pool(config:$poolconfig):$connpool;
```

#### Usage example

```
i=http:std.http;

let resp=http.get("https://api.example.com/users/1")!$apperr.Network;
let body=resp.body;
let pool=http.pool($poolconfig{maxconns:10;idletimeoutms:30000;tlsverify:true});
```

#### Sum types

- `$clienterr` -- sum type: `Timeout`, `Refused`, `DNS`, `TLS`, `Status`
- `$httperr` -- sum type (from base module): `BadRequest`, `NotFound`, `Internal`, `Timeout`

---

### 3. std.crypto (extensions)

The base `std.crypto` module (spec Section 16) provides `crypto.sha256`, `crypto.hmacsha256`, and `crypto.tohex`. These extensions add SHA-512, BLAKE3, HMAC-SHA-512, and constant-time comparison.

#### .tki interface

```
m=std.crypto;

f=crypto.sha512(data:@byte):@byte;
f=crypto.blake3(data:@byte):@byte;
f=crypto.hmacsha512(key:@byte;data:@byte):@byte;
f=crypto.constanteq(a:@byte;b:@byte):bool;
```

#### Usage example

```
i=crypto:std.crypto;
i=str:std.str;

let hash=crypto.sha512(str.bytes(payload));
let sig=crypto.hmacsha512(str.bytes(secret);str.bytes(payload));
let valid=crypto.constanteq(sig;expected);
```

#### Sum types

None. All functions in this extension are total (no error return). Hash functions operate on `@byte` and return `@byte`; use `crypto.tohex` from the base module to convert to hex strings.

---

## Tier 1 -- Web and API Platform

These modules are new additions to the standard library, providing the capabilities needed to build production web services and APIs.

---

### 4. std.encoding

Base64, hex, and URL encoding/decoding.

#### .tki interface

```
m=std.encoding;

t=$decodeerr{
  BadInput:str;
  BadLength:u64
};

f=encoding.base64encode(data:@byte):str;
f=encoding.base64decode(data:str):@byte!$decodeerr;
f=encoding.hexencode(data:@byte):str;
f=encoding.hexdecode(data:str):@byte!$decodeerr;
f=encoding.urlencode(data:str):str;
f=encoding.urldecode(data:str):str!$decodeerr;
```

#### Usage example

```
i=enc:std.encoding;
i=str:std.str;

let encoded=enc.base64encode(str.bytes("hello world"));
let decoded=enc.base64decode(encoded)!$apperr.Decode;
let urlsafe=enc.urlencode("key=value&foo=bar baz");
```

#### Sum types

- `$decodeerr` -- sum type: `BadInput` (malformed input string), `BadLength` (wrong padding/length)

---

### 5. std.auth

JWT signing/verification, API key validation, and bearer token extraction.

#### .tki interface

```
m=std.auth;

t=$jwtalg{
  Hs256:bool;
  Hs384:bool;
  Rs256:bool
};

t=$jwtclaims{
  sub:str;
  iss:str;
  exp:u64;
  iat:u64;
  extra:@(@str)
};

t=$keystore{id:str};

t=$autherr{
  Expired:u64;
  BadSignature:str;
  Malformed:str;
  InvalidKey:str;
  Missing:str
};

f=auth.jwtsign(claims:$jwtclaims;secret:@byte;alg:$jwtalg):str!$autherr;
f=auth.jwtverify(token:str;secret:@byte):$jwtclaims!$autherr;
f=auth.apikeyvalidate(key:str;store:$keystore):bool!$autherr;
f=auth.bearerextract(req:$req):str!$autherr;
```

#### Usage example

```
i=auth:std.auth;
i=str:std.str;

let token=auth.jwtsign($jwtclaims{sub:"user42";iss:"myapp";exp:1720000000;iat:1719900000;extra:@()};str.bytes(secret);$jwtalg{Hs256:true})!$apperr.Auth;
let claims=auth.jwtverify(token;str.bytes(secret))!$apperr.Auth;
let bearer=auth.bearerextract(req)!$apperr.Auth;
```

#### Sum types

- `$jwtalg` -- sum type: `Hs256`, `Hs384`, `Rs256` (algorithm selection; payload is `bool` for zero-payload variants)
- `$autherr` -- sum type: `Expired`, `BadSignature`, `Malformed`, `InvalidKey`, `Missing`

---

### 6. std.router

HTTP request routing with middleware, CORS, rate limiting, and path/query parameter extraction.

#### .tki interface

```
m=std.router;

t=$router{id:u64};
t=$handler{id:u64};
t=$middleware{id:u64};

t=$routererr{
  NotFound:str;
  MethodNotAllowed:str;
  BadPattern:str
};

f=router.new():$router;
f=router.get(r:$router;path:str;handler:$handler):$router;
f=router.post(r:$router;path:str;handler:$handler):$router;
f=router.put(r:$router;path:str;handler:$handler):$router;
f=router.delete(r:$router;path:str;handler:$handler):$router;
f=router.use(r:$router;mw:$middleware):$router;
f=router.cors(origins:@str):$middleware;
f=router.ratelimit(rpm:i64):$middleware;
f=router.params(req:$req):@(str:str);
f=router.query(req:$req):@(str:str);
```

#### Usage example

```
i=rt:std.router;

let r=rt.new();
let r=rt.get(r;"/users/:id";userhandler);
let r=rt.post(r;"/users";createhandler);
let r=rt.use(r;rt.cors(@("https://example.com")));
let r=rt.use(r;rt.ratelimit(100));
```

#### Sum types

- `$routererr` -- sum type: `NotFound`, `MethodNotAllowed`, `BadPattern`

#### Design notes

The `$router`, `$handler`, and `$middleware` types are opaque handles (represented as structs with an `id` field). This follows the same pattern as `$connpool` in `std.http` and `$socket` in `std.net` -- runtime resources are identified by handle, not by exposing internal state.

The builder pattern (`router.get` returns `$router`) allows chained configuration without mutable state. Each call returns a new router value with the route added.

---

### 7. std.ws

WebSocket connections: upgrade, send, broadcast, message handling, and close.

#### .tki interface

```
m=std.ws;

t=$wsconn{id:u64;ready:bool};

t=$wsframe{
  opcode:u8;
  payload:@byte;
  fin:bool
};

t=$msghandler{id:u64};

t=$wserr{
  UpgradeFailed:str;
  Closed:u16;
  SendFailed:str;
  FrameErr:str
};

f=ws.upgrade(req:$req;res:$res):$wsconn!$wserr;
f=ws.send(conn:$wsconn;msg:str):void!$wserr;
f=ws.broadcast(conns:@$wsconn;msg:str):void;
f=ws.onmessage(conn:$wsconn;handler:$msghandler):void;
f=ws.close(conn:$wsconn;code:u16):void;
```

#### Usage example

```
i=ws:std.ws;

let conn=ws.upgrade(req;res)!$apperr.WS;
ws.send(conn;"hello")!$apperr.WS;
ws.onmessage(conn;echohandler);
ws.close(conn;1000);
```

#### Sum types

- `$wserr` -- sum type: `UpgradeFailed`, `Closed`, `SendFailed`, `FrameErr`

---

### 8. std.template

HTML node construction, text escaping, and server-side rendering to string.

#### .tki interface

```
m=std.template;

t=$node{tag:str;attrs:@(str:str);children:@$node;text:str};

t=$templateerr{
  BadTag:str;
  BadAttr:str;
  RenderFailed:str
};

f=template.html(tag:str;attrs:@(str:str);children:@$node):$node;
f=template.text(content:str):$node;
f=template.render(node:$node):str!$templateerr;
f=template.escape(raw:str):str;
f=template.script(code:str):$node;
f=template.style(css:str):$node;
```

#### Usage example

```
i=tpl:std.template;

let page=tpl.html("div";@("class":"container");@(tpl.html("h1";@();@(tpl.text("hello")))));
let safe=tpl.escape(userinput);
let out=tpl.render(page)!$apperr.Render;
```

#### Sum types

- `$templateerr` -- sum type: `BadTag`, `BadAttr`, `RenderFailed`

#### Design notes

The `$node` type is a struct, not a sum type. All nodes share the same shape; a text-only node has an empty `tag` and empty `children`. This avoids the need for pattern matching on every node operation and keeps the rendering pipeline simple.

The `template.escape` function is total -- it always succeeds, converting `<`, `>`, `&`, `"` to their HTML entity equivalents. This is critical for preventing XSS in server-rendered output.

---

## Cross-Cutting Patterns

Several patterns recur across these modules, demonstrating that the 56-character syntax supports them cleanly.

### Error handling with `!`

Every fallible function declares its error type explicitly: `f=name(...):$returntype!$errtype;`. Callers propagate errors with `!$variant`:

```
let claims=auth.jwtverify(token;secret)!$apperr.Auth;
```

This is the same pattern used in the Tier 0 base modules (`json.dec`, `db.one`, `file.read`). The syntax scales from simple I/O errors to complex authentication failures without changing shape.

### Opaque handles

Runtime resources (`$router`, `$connpool`, `$wsconn`, `$handler`, `$middleware`, `$msghandler`, `$keystore`) use opaque struct handles with an `id:u64` field. The caller never inspects internal state; all interaction goes through module functions. This pattern keeps the `.tki` interface minimal while allowing implementation flexibility.

### Builder pattern

`std.router` demonstrates the builder pattern: each function takes a `$router` and returns a new `$router`. Because toke bindings are immutable by default, this is idiomatic:

```
let r=rt.new();
let r=rt.get(r;"/users/:id";handler);
let r=rt.use(r;rt.cors(@("https://example.com")));
```

The rebinding of `let r` is permitted because each `let` introduces a new binding that shadows the previous one.

### Map types for key-value data

Path parameters and query strings return `@(str:str)` -- a map from string to string. HTML attributes use the same type. This is a natural fit for the `@(key:val)` map syntax:

```
let p=rt.params(req);
let id=p.get("id");
```

---

## Conclusion

These APIs demonstrate that the 56-character syntax expresses production API surfaces cleanly, with type safety and error handling preserved. The patterns shown here -- explicit error types, opaque handles, builder chains, map types for key-value data -- are the same patterns a web developer uses in any production language. The difference is density: every character carries meaning, every type boundary is visible, and every error path is declared in the signature.

The 8 modules specified above cover the full stack of a production web service: JSON streaming, HTTP client/server, cryptography, encoding, authentication, routing, WebSocket communication, and HTML rendering. None of them required syntax extensions, workarounds, or deviations from the base grammar. The 56-character set is sufficient.

!!!warning This section is for advanced users!
If you came here, you probably already know JavaScript. If not, https://javascript.info is your best friend.
<br>A bit of TypeScript knowledge may also be helpful for understanding types, though not required.
!!!

## Some technical information

Operator sandbox is based on the awesome [vm2](https://github.com/patriksimek/vm2).
The environment is Node.js v16.15 (as of 04/06/2022, DD/MM/YYYY).

## Limitations

`Buffer`, `setTimeout`, `setInterval`, and `setImmediate` are removed from the sandbox for security reasons.
Maximum execution time is 10s, enforced using a custom timeout implementation (timeout in vm2 is broken).

## Global object

### console

A console-like object, but writes into the server log instead of stdout/stderr.
<br>Doesn't format input. All non-string values are silently ignored.

#### console.log(message: string): void

#### console.info(message: string): void

#### console.warn(message: string): void

#### console.error(message: string): void

#### console.debug(message: string): void

### phin (aliases: `p`)

Used for creating HTTP requests. The API is almost the same as in [Phin](https://github.com/ethanent/phin).
This section only describes differences.

!!!warning
For security reasons, there is a whitelist of URLs that you can access.
Request hosts to be added in [Discussions](https://github.com/Sly-Little-Fox/operator/discussions).
<br>Complete list of allowed hosts can be found in ./src/config/security.ts. This file can be changed when self-hosting.
!!!

#### (await phin(...)).body

Returns the response body. If it's a buffer, returns it as a string. Else returns the original body.

#### (await phin(...)).toString()

Returns the response body as string. If it's a buffer, returns it as a string.
Else runs JSON.stringify() on it and returns. This function is also run
when the response is implicitly converted to a string.

### \_ (Lodash)

Full build of Lodash, a modern replacement for Underscore.js. Provided unmodified because Lodash doesn't provide any unsafe functions.

### ctx (context)

This is the most important part of the runtime — the context! Refer to the next section for details about context.

## Context

There are different types of contexts for different events. Here is some information about them.


### Message sent/deleted (messageCreate / messageDelete)

#### ctx.message (FilteredMessage)

#### ctx.guild (FilteredGuild)


### Message edited (messageUpdate)

#### ctx.oldMessage (FilteredMessage)

#### ctx.message (FilteredMessage)

#### ctx.guild (FilteredGuild)


### Warning created/removed (warningCreated / warningRemoved)

#### ctx.member (FilteredMember)
The target member that was just warned.

#### ctx.moderator (FilteredMember)
The moderator who warned this ~~poor~~ member.

#### ctx.reason (string)

#### ctx.warningId (number)

#### ctx.guild (FilteredGuild)


### Warnings reset (warningsReset)

#### ctx.member (FilteredMember)
The member who we are removing warnings from (yay!)

#### ctx.moderator (FilteredMember)
The moderator to blame for this.

#### ctx.reason (string)

#### ctx.warningIds (number[])

#### ctx.guild (FilteredGuild)

<br>

!!!warning
This page is unfinished! It should be finished soon, but you can help on GitHub!
!!!

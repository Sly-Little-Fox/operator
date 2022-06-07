---
title: What are handlers?
description: Handlers are a way to run JavaScript code (ES2022) in a secure limited environment.
order: 10
---

~~Handlers are a unique feature of Operator. They are used for fast and secure serverless contextual event handling...~~ No no no, not that.

Handlers are a way to run JavaScript code (ES2022) in a secure limited environment. They have access to event context (message, warning information, target member for the warning, etc.), but don't have access to `import` or `require()`.

Handlers have a hard timeout of 10 seconds (~~[currently broken](https://github.com/patriksimek/vm2/issues/180)~~ using a workaround).

If you want to start creating handlers, check out the reference.

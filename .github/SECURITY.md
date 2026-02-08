# Security

## Reporting Issues

If you find a security issue, please open a GitHub issue or reach out to me directly through my GitHub profile. If it's something sensitive (like a way to exfiltrate user data), feel free to mark it as a private vulnerability report on GitHub instead of a public issue.

Include what you found, how to reproduce it, and which files are involved if you know.

## Worth Knowing

This is a client-side PWA — there's no server, no API, no database I control. All user data lives in IndexedDB on the user's own device. That said, XSS in the settings or import flow could still be a problem, so I take input validation seriously.

The current supported version is whatever's on the `master` branch.

# Development signing only

`preview-keystore.base64` is an intentionally PUBLIC development certificate with standard
Android debug credentials. It provides stable APK updates starting with version 0.7.
It is not a secret and must NEVER sign a production release. Production needs a separate
private keystore managed by the owner. Previous CI builds (0.5/0.6) used ephemeral certificates
whose private keys are unavailable; they cannot be updated with this certificate.

Gradle decodes this file into the ignored `preview.jks` before a debug build.

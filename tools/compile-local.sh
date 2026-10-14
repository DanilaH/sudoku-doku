#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p engine/build
cache="${GRADLE_USER_HOME:-$HOME/.gradle}/caches/modules-2/files-2.1"
compiler_cp=$(find "$cache" -name '*.jar' \( -path '*/org.jetbrains.kotlin/*' -o -path '*/org.jetbrains.kotlinx/kotlinx-coroutines-core-jvm/*' -o -path '*/org.jetbrains/annotations/*' \) | paste -sd:)
stdlib=$(find "$cache/org.jetbrains.kotlin/kotlin-stdlib/2.2.20" -name '*.jar' | head -1)
java -cp "$compiler_cp" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -no-reflect -classpath "$stdlib" -jvm-target 17 -d engine/build/engine.jar engine/src/main/kotlin/doku/*.kt
java -cp "engine/build/engine.jar:$stdlib" "${1:-doku.BankKt}" "${@:2}"

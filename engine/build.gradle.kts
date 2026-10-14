plugins { kotlin("jvm"); application }
kotlin { jvmToolchain(17) }
application { mainClass.set("doku.BankKt") }
tasks.named<JavaExec>("run") { workingDir = rootProject.projectDir }
tasks.register<JavaExec>("verifyBank") {
    dependsOn("classes")
    classpath = sourceSets.main.get().runtimeClasspath
    mainClass.set("doku.VerifyKt")
    workingDir = rootProject.projectDir
}

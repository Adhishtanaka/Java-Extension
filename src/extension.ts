import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  const langSupExtension = vscode.extensions.getExtension("redhat.java");
  if (!langSupExtension) {
    vscode.window
      .showInformationMessage(
        'We recommend Language Support for Java(TM) by Red Hat Extenstion for Java Intellisense.',
        "Install"
      )
      .then((action) => {
        if (action === "Install") {
          vscode.commands.executeCommand(
            "workbench.extensions.installExtension",
            "redhat.java"
          );
        }
      });
  }

  let disposable = vscode.commands.registerCommand("java-extension.brj", () => {
    vscode.workspace.saveAll().then(() => {
      const activeEditor: vscode.TextEditor | undefined =
        vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }

      const document = activeEditor.document;

      if (!document.getText().includes("public static void main")) {
        vscode.window.showErrorMessage(
          "The current Java file does not contain a main method."
        );
        return;
      }

      const folderPath = path.dirname(document.uri.fsPath);
      const outputFolderPath = path.join(folderPath, "classes");

      if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath);
      }

      const fileName = vscode.workspace
        .asRelativePath(document.uri)
        .replace(".java", "");

      const terminal =
        vscode.window.activeTerminal || vscode.window.createTerminal();

      const javaHome = process.env["JAVA_HOME"];

      const config = vscode.workspace.getConfiguration("java-extension");
      const showNotifi = config.showNotification;

      if (!javaHome && showNotifi) {
        vscode.window
          .showErrorMessage(
            "Java compiler not found.Please setup JAVA_HOME variable or Download a Java Development Kit (JDK) from the official website.",
            "Download JDK",
            "Ignore"
          )
          .then((choice) => {
            if (choice === "Download JDK") {
              vscode.env.openExternal(
                vscode.Uri.parse(
                  "https://www.oracle.com/in/java/technologies/downloads/"
                )
              );
            } else if (choice === "Ignore") {
              config
                .update(
                  "showNotification",
                  false,
                  vscode.ConfigurationTarget.Global
                )
                .then(() => {
                  vscode.window.showInformationMessage(
                    "Notifications disabled."
                  );
                });
            }
          });
      }

      terminal.sendText(`javac -d classes *.java`);

      if (process.platform === "win32") {
        terminal.sendText(`cls`);
      } else {
        terminal.sendText(`clear`);
      }

      terminal.sendText(`java -cp classes ${fileName}`);
      terminal.show();
    });
  });

  context.subscriptions.push(disposable);
}

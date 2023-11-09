var import_vscode = require("vscode");,var matchCodeMessage = "We found a reference to public code in a recent suggestion.",
  MatchAction = "View log",
  CodeReferenceKey = "codeReference.notified";,function notify(ctx) {
  let extension = ctx.get(Extension);
  if (extension.context.globalState.get(CodeReferenceKey)) return;
  ctx.get(NotificationSender).showWarningMessage(matchCodeMessage, {
    title: MatchAction
  }).then(action => {
    let event = {
      context: ctx,
      actor: "user"
    };
    switch (action?.title) {
      case MatchAction:
        {
          matchNotificationTelemetry.handleDoAction(event), u0e.commands.executeCommand(OutputPaneShowCommand);
          break;
        }
      case void 0:
        {
          matchNotificationTelemetry.handleDismiss(event);
          break;
        }
    }
  }), extension.context.globalState.update(CodeReferenceKey, !0);
},__name(notify, "notify");
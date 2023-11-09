var POLICY_ENDPOINT = "https://repositorypolicy.azurewebsites.net/GetPolicy/v1";,var NOT_BLOCKED_RESPONSE = {
    isBlocked: !1,
    reason: "VALID_FILE"
  },
  NOT_BLOCKED_NO_MATCHING_POLICY_RESPONSE = {
    isBlocked: !1,
    reason: "NO_MATCHING_POLICY"
  },
  BLOCKED_REPO_RESPONSE = {
    isBlocked: !0,
    reason: "REPO_BLOCKED",
    message: "Your organization has disabled Copilot for this repository"
  },
  BLOCKED_FILE_RESPONSE = {
    isBlocked: !0,
    reason: "FILE_BLOCKED",
    message: "Your organization has disabled Copilot for this file"
  },
  BLOCKED_POLICY_ERROR_RESPONSE = {
    isBlocked: !0,
    reason: "POLICY_ERROR",
    message: "Copilot is disabled because we could not fetch the repository policy"
  };
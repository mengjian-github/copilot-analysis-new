var import_typebox = Ns(ou()),
  MatchError = ba.Type.Object({
    kind: ba.Type.Literal("failure"),
    reason: ba.Type.String(),
    code: ba.Type.Number(),
    msg: ba.Type.String(),
    meta: ba.Type.Optional(ba.Type.Any())
  }),
  Snippet = ba.Type.Object({
    matched_source: ba.Type.String(),
    occurrences: ba.Type.String(),
    capped: ba.Type.Boolean(),
    cursor: ba.Type.String(),
    github_url: ba.Type.String()
  }),
  MatchRequest = ba.Type.Object({
    source: ba.Type.String()
  }),
  MatchSuccess = ba.Type.Object({
    snippets: ba.Type.Array(Snippet)
  }),
  MatchResponse = ba.Type.Union([MatchSuccess, MatchError]),
  FileMatchRequest = ba.Type.Object({
    cursor: ba.Type.String()
  }),
  FileMatch = ba.Type.Object({
    commit_id: ba.Type.String(),
    license: ba.Type.String(),
    nwo: ba.Type.String(),
    path: ba.Type.String(),
    url: ba.Type.String()
  }),
  PageInfo = ba.Type.Object({
    has_next_page: ba.Type.Boolean(),
    cursor: ba.Type.String()
  }),
  LicenseStats = ba.Type.Object({
    count: ba.Type.Record(ba.Type.String(), ba.Type.String())
  }),
  FileMatchSuccess = ba.Type.Object({
    file_matches: ba.Type.Array(FileMatch),
    page_info: PageInfo,
    license_stats: LicenseStats
  }),
  FileMatchResponse = ba.Type.Union([FileMatchSuccess, MatchError]);
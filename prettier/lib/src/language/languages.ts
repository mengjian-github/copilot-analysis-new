var knownTemplateLanguageExtensions = [".ejs", ".erb", ".haml", ".hbs", ".j2", ".jinja", ".jinja2", ".liquid", ".mustache", ".njk", ".php", ".pug", ".slim", ".webc"],
  templateLanguageLimitations = {
    ".php": [".blade"]
  },
  knownFileExtensions = Object.keys(knownLanguages).flatMap(language => knownLanguages[language].extensions);
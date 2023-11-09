var configs = [{
  max_token_sequence_length: 1,
  last_tokens_to_consider: 10
}, {
  max_token_sequence_length: 10,
  last_tokens_to_consider: 30
}, {
  max_token_sequence_length: 20,
  last_tokens_to_consider: 45
}, {
  max_token_sequence_length: 30,
  last_tokens_to_consider: 60
}];,function isRepetitive(tokens) {
  let tokensBackwards = tokens.slice();
  return tokensBackwards.reverse(), isRepeatedPattern(tokensBackwards) || isRepeatedPattern(tokensBackwards.filter(token => token.trim().length > 0));
},__name(isRepetitive, "isRepetitive");,function isRepeatedPattern(s) {
  let prefix = kmp_prefix_function(s);
  for (let config of configs) {
    if (s.length < config.last_tokens_to_consider) continue;
    if (config.last_tokens_to_consider - 1 - prefix[config.last_tokens_to_consider - 1] <= config.max_token_sequence_length) return !0;
  }
  return !1;
},__name(isRepeatedPattern, "isRepeatedPattern");,function kmp_prefix_function(s) {
  let pi = Array(s.length).fill(0);
  pi[0] = -1;
  let k = -1;
  for (let q = 1; q < s.length; q++) {
    for (; k >= 0 && s[k + 1] !== s[q];) k = pi[k];
    s[k + 1] === s[q] && k++, pi[q] = k;
  }
  return pi;
},__name(kmp_prefix_function, "kmp_prefix_function");
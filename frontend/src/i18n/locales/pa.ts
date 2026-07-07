// Punjabi (ਪੰਜਾਬੀ) locale. Mirrors the keys defined in en.ts.
// Placeholders like {var} are preserved verbatim.
const pa: Record<string, string> = {
  // Brand / nav
  'brand.tagline': 'ਭਾਰਤ · ਲੋਕਾਂ ਦੀਆਂ ਤਰਜੀਹਾਂ',
  'nav.portal': 'ਨਾਗਰਿਕ ਪੋਰਟਲ',
  'nav.myConstituency': 'ਮੇਰਾ ਹਲਕਾ',
  'nav.pmoCommand': 'PMO ਕਮਾਂਡ',
  'nav.staffLogin': 'ਸਟਾਫ ਲੌਗਇਨ',
  'nav.signOut': 'ਸਾਈਨ ਆਊਟ',
  'role.pmo': 'PMO · ਸੁਪਰ ਐਡਮਿਨ',
  'role.mp': 'ਸੰਸਦ ਮੈਂਬਰ',
  'lang.label': 'ਭਾਸ਼ਾ',

  // Common / picker
  'common.selectState': 'ਰਾਜ ਚੁਣੋ…',
  'common.selectConstituency': 'ਹਲਕਾ ਚੁਣੋ…',
  'common.pickStateFirst': 'ਪਹਿਲਾਂ ਇੱਕ ਰਾਜ ਚੁਣੋ',
  'common.loading': 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
  'picker.stateLabel': 'ਰਾਜ / UT',
  'picker.constituencyLabel': 'ਹਲਕਾ',
  'auth.verifying': 'ਪਹੁੰਚ ਦੀ ਪੁਸ਼ਟੀ ਹੋ ਰਹੀ ਹੈ…',

  // Portal
  'portal.heroA': 'ਆਪਣੀ ਆਵਾਜ਼ ਬੁਲੰਦ ਕਰੋ,',
  'portal.heroB': 'ਆਪਣੇ ਹਲਕੇ ਨੂੰ ਸੰਵਾਰੋ',
  'portal.subtitle':
    'ਸਥਾਨਕ ਸਮੱਸਿਆਵਾਂ ਦੀ ਰਿਪੋਰਟ ਲਿਖਤ, ਆਵਾਜ਼ ਜਾਂ ਫੋਟੋ ਰਾਹੀਂ ਕਰੋ। ਤੁਹਾਡੀ ਬੇਨਤੀ ਸਿੱਧੀ ਤੁਹਾਡੇ ਚੁਣੇ ਹੋਏ ਸੰਸਦ ਮੈਂਬਰ ਕੋਲ ਪਹੁੰਚਦੀ ਹੈ।',
  'portal.step1': '1 · ਤੁਸੀਂ ਕਿੱਥੇ ਰਹਿੰਦੇ ਹੋ?',
  'portal.step2': '2 · ਸਮੱਸਿਆ ਬਾਰੇ ਦੱਸੋ',
  'portal.detecting': 'GPS ਤੋਂ ਪਤਾ ਲਗਾਇਆ ਜਾ ਰਿਹਾ ਹੈ…',
  'portal.autofilled': 'ਤੁਹਾਡੇ ਟਿਕਾਣੇ ਤੋਂ ਆਪਣੇ-ਆਪ ਭਰਿਆ ਗਿਆ — ਕਿਰਪਾ ਕਰਕੇ ਪੁਸ਼ਟੀ ਕਰੋ',
  'portal.routedTo': 'ਤੁਹਾਡੀ ਬੇਨਤੀ ਇਹਨਾਂ ਕੋਲ ਭੇਜੀ ਜਾਵੇਗੀ',
  'portal.enableLocation': 'ਆਪਣੇ MLA ਅਤੇ ਸਥਾਨਕ ਸੰਸਥਾ ਕੋਲ ਵੀ ਭੇਜਣ ਲਈ ਟਿਕਾਣਾ ਚਾਲੂ ਕਰੋ।',
  'portal.recordLabel': 'ਆਵਾਜ਼ ਵਿੱਚ ਬੇਨਤੀ ਰਿਕਾਰਡ ਕਰੋ (ਕਿਸੇ ਵੀ ਭਾਰਤੀ ਭਾਸ਼ਾ ਵਿੱਚ)',
  'portal.tapToRecord': 'ਰਿਕਾਰਡ ਕਰਨ ਲਈ ਟੈਪ ਕਰੋ',
  'portal.recording': 'ਰਿਕਾਰਡ ਹੋ ਰਿਹਾ ਹੈ…',
  'portal.voiceRecorded': 'ਆਵਾਜ਼ ਕਲਿੱਪ ਰਿਕਾਰਡ ਹੋ ਗਈ',
  'portal.voiceLangs': 'ਹਿੰਦੀ, ਤਮਿਲ, ਬੰਗਾਲੀ, ਅੰਗਰੇਜ਼ੀ ਅਤੇ ਹੋਰ',
  'portal.lengthLimit': 'ਲੰਬਾਈ: {duration}s (60s ਹੱਦ)',
  'portal.readyToSubmit': 'ਦਰਜ ਹੋ ਗਿਆ। ਜਮ੍ਹਾਂ ਕਰਨ ਲਈ ਤਿਆਰ।',
  'portal.orWrite': 'ਜਾਂ ਆਪਣੀ ਬੇਨਤੀ ਲਿਖੋ',
  'portal.writePlaceholder':
    'ਜਿਵੇਂ ਬਾਜ਼ਾਰ ਦੇ ਨੇੜੇ ਪਾਣੀ ਦੀ ਪਾਈਪਲਾਈਨ ਟੁੱਟੀ ਹੋਈ ਹੈ; ਮੁੱਖ ਸੜਕ ਉੱਤੇ ਸਟਰੀਟ ਲਾਈਟਾਂ ਕੰਮ ਨਹੀਂ ਕਰ ਰਹੀਆਂ…',
  'portal.phone': 'ਫੋਨ (ਵਿਕਲਪਿਕ)',
  'portal.phonePlaceholder': 'ਜਿਵੇਂ +91 98XXXXXXXX',
  'portal.photo': 'ਫੋਟੋ (ਵਿਕਲਪਿਕ)',
  'portal.attachImage': 'ਤਸਵੀਰ ਜੋੜੋ',
  'portal.gpsCaptured': 'GPS ਦਰਜ ਹੋਇਆ ({lat}, {lng})',
  'portal.gpsWaiting': 'GPS ਦੀ ਉਡੀਕ ਹੋ ਰਹੀ ਹੈ…',
  'portal.submit': 'ਮੇਰੇ MP ਨੂੰ ਜਮ੍ਹਾਂ ਕਰੋ',
  'portal.analysing': 'AI ਨਾਲ ਵਿਸ਼ਲੇਸ਼ਣ ਹੋ ਰਿਹਾ ਹੈ…',
  'portal.selectConstituencyAlert':
    'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਰਾਜ ਅਤੇ ਹਲਕਾ ਚੁਣੋ ਤਾਂ ਜੋ ਅਸੀਂ ਤੁਹਾਡੀ ਬੇਨਤੀ ਸਹੀ MP ਕੋਲ ਭੇਜ ਸਕੀਏ।',
  'portal.describeAlert': 'ਕਿਰਪਾ ਕਰਕੇ ਵੇਰਵਾ ਦਰਜ ਕਰੋ ਜਾਂ ਆਵਾਜ਼ ਸੰਦੇਸ਼ ਰਿਕਾਰਡ ਕਰੋ।',
  'portal.submitFail': 'ਸੁਝਾਅ ਜਮ੍ਹਾਂ ਕਰਨ ਵਿੱਚ ਅਸਫਲ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'portal.successTitle': 'ਤੁਹਾਡੀ ਬੇਨਤੀ ਦਰਜ ਹੋ ਗਈ ਹੈ!',
  'portal.followedUp': 'ਤੁਹਾਡੀ ਬੇਨਤੀ ਦੀ ਇਹਨਾਂ ਸਭ ਵਿੱਚ ਪੈਰਵੀ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ:',
  'portal.routedToMp': 'ਤੁਹਾਡੇ MP ਨੂੰ ਭੇਜੀ ਗਈ',
  'portal.yourReport': 'ਤੁਹਾਡੀ ਰਿਪੋਰਟ',
  'portal.aiCategory': 'AI ਸ਼੍ਰੇਣੀ',
  'portal.sentimentLabel': 'ਭਾਵਨਾ',
  'portal.priorityScore': 'ਤਰਜੀਹ ਅੰਕ',
  'portal.submitAnother': 'ਇੱਕ ਹੋਰ ਬੇਨਤੀ ਜਮ੍ਹਾਂ ਕਰੋ',

  // Routing tree
  'tree.mpTier': 'ਸੰਸਦ · ਲੋਕ ਸਭਾ (MP)',
  'tree.mlaTier': 'ਰਾਜ · ਵਿਧਾਨ ਸਭਾ (MLA)',
  'tree.localTier': 'ਸਥਾਨਕ ਸੰਸਥਾ',
  'tree.mpFallback': 'ਸੰਸਦ ਮੈਂਬਰ',
  'tree.mlaUpdating': 'MLA — ਰਿਕਾਰਡ ਅੱਪਡੇਟ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ',
  'tree.noInfo': 'ਇਹ ਵੇਖਣ ਲਈ ਟਿਕਾਣਾ ਚਾਲੂ ਕਰੋ ਕਿ ਤੁਹਾਡੀ ਬੇਨਤੀ ਕੌਣ ਸੰਭਾਲੇਗਾ।',

  // Login
  'login.title': 'ਸਰਕਾਰੀ ਸਾਈਨ ਇਨ',
  'login.subtitle': 'PMO ਅਧਿਕਾਰੀਆਂ ਅਤੇ ਸੰਸਦ ਮੈਂਬਰਾਂ ਲਈ।',
  'login.email': 'ਈਮੇਲ ਪਤਾ',
  'login.password': 'ਪਾਸਵਰਡ',
  'login.signIn': 'ਸਾਈਨ ਇਨ',
  'login.signingIn': 'ਸਾਈਨ ਇਨ ਹੋ ਰਿਹਾ ਹੈ…',
  'login.invalid': 'ਗਲਤ ਈਮੇਲ ਜਾਂ ਪਾਸਵਰਡ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'login.demoAccounts': 'ਡੈਮੋ ਖਾਤੇ',

  // MP dashboard
  'dash.mpBadge': 'ਸੰਸਦ ਮੈਂਬਰ · 18ਵੀਂ ਲੋਕ ਸਭਾ',
  'dash.requests': 'ਬੇਨਤੀਆਂ',
  'dash.unresolved': 'ਅਣਸੁਲਝੀਆਂ',
  'dash.sanctioned': 'ਮਨਜ਼ੂਰਸ਼ੁਦਾ',
  'dash.wikipedia': 'Wikipedia',
  'dash.syncData': 'ਡਾਟਾ ਸਿੰਕ ਕਰੋ',
  'dash.loading': 'ਹਲਕੇ ਦੇ ਮਾਪਦੰਡ ਲੋਡ ਹੋ ਰਹੇ ਹਨ…',
  'dash.liveMap': 'ਲਾਈਵ ਸ਼ਿਕਾਇਤ ਨਕਸ਼ਾ',
  'dash.localReps': 'ਸਥਾਨਕ ਪ੍ਰਤੀਨਿਧ — ਵਿਧਾਨ ਸਭਾ ਹਲਕੇ (MLAs)',
  'dash.localRepsSub':
    'ਇਸ ਸੰਸਦੀ ਸੀਟ ਵਿੱਚ ਬੇਨਤੀਆਂ ਸਬੰਧਤ MLA ਅਤੇ ਸਥਾਨਕ ਸੰਸਥਾ ਕੋਲ ਵੀ ਭੇਜੀਆਂ ਜਾਂਦੀਆਂ ਹਨ।',
  'dash.mlaToUpdate': 'MLA — ਅੱਪਡੇਟ ਕੀਤਾ ਜਾਣਾ ਹੈ',

  // Analytics
  'analytics.totalSuggestions': 'ਕੁੱਲ ਸੁਝਾਅ',
  'analytics.recommendedProjects': 'ਸਿਫਾਰਸ਼ੀ ਪ੍ਰੋਜੈਕਟ',
  'analytics.unresolvedRate': 'ਅਣਸੁਲਝੀ ਦਰ',
  'analytics.sectorDemand': 'ਖੇਤਰ-ਵਾਰ ਸ਼ਿਕਾਇਤ ਮੰਗ (ਹਲਕੇ ਦੇ ਮਾਪਦੰਡ)',
  'analytics.noDemand': 'ਹਾਲੇ ਤੱਕ ਕੋਈ ਮੰਗ ਬੇਨਤੀ ਦਰਜ ਨਹੀਂ ਹੋਈ।',

  // Project prioritizer
  'proj.title': 'AI-ਤਰਜੀਹੀ ਵਿਕਾਸ ਕਾਰਜ',
  'proj.subtitle': 'MPLADS ਫੰਡ ਵੰਡ ਜ਼ਰੂਰੀਅਤ ਦੇ ਮਾਪਦੰਡਾਂ ਅਨੁਸਾਰ ਗਤੀਸ਼ੀਲ ਤਰੀਕੇ ਨਾਲ ਦਰਜਾਬੰਦ।',
  'proj.runAI': 'AI ਤਰਜੀਹਬੰਦੀ ਚਲਾਓ',
  'proj.ranking': 'ਦਰਜਾਬੰਦੀ ਹੋ ਰਹੀ ਹੈ…',
  'proj.none1': 'ਹਾਲੇ ਤੱਕ ਕੋਈ ਸਿਫਾਰਸ਼ੀ ਪ੍ਰੋਜੈਕਟ ਤਿਆਰ ਨਹੀਂ ਹੋਇਆ।',
  'proj.none2': 'ਨਾਗਰਿਕ ਮੰਗਾਂ ਨੂੰ ਸਕੈਨ ਕਰਨ ਲਈ ਉੱਪਰ "AI ਤਰਜੀਹਬੰਦੀ ਚਲਾਓ" ਉੱਤੇ ਕਲਿੱਕ ਕਰੋ।',
  'proj.priority': 'ਤਰਜੀਹ: {score}',
  'proj.estCost': 'ਅਨੁਮਾਨਿਤ ਲਾਗਤ',
  'proj.supporting': 'ਸਮਰਥਨ ਪਟੀਸ਼ਨਾਂ',
  'proj.citizens': '{count} ਨਾਗਰਿਕ',
  'proj.sanctionWork': 'ਕਾਰਜ ਮਨਜ਼ੂਰ ਕਰੋ',
  'proj.categoryLabel': 'ਸ਼੍ਰੇਣੀ: {cat}',
  'proj.aiDone': 'AI ਤਰਜੀਹਬੰਦੀ ਮਾਡਲ ਪੂਰਾ ਹੋਇਆ! ਨਵੇਂ ਪ੍ਰੋਜੈਕਟ ਪ੍ਰਸਤਾਵ ਤਿਆਰ ਹੋਏ।',
  'proj.aiFail': 'ਪ੍ਰੋਜੈਕਟ ਸੁਝਾਅ ਤਿਆਰ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',
  'proj.updateFail': 'ਪ੍ਰੋਜੈਕਟ ਸਥਿਤੀ ਅੱਪਡੇਟ ਕਰਨ ਵਿੱਚ ਅਸਫਲ।',

  // PMO
  'pmo.title': 'PMO ਕਮਾਂਡ ਸੈਂਟਰ',
  'pmo.subtitle': 'ਸਾਰੇ {count} ਹਲਕਿਆਂ ਅਤੇ ਉਹਨਾਂ ਦੇ ਸੰਸਦ ਮੈਂਬਰਾਂ ਦੀ ਰਾਸ਼ਟਰੀ ਨਿਗਰਾਨੀ।',
  'pmo.loading': 'ਰਾਸ਼ਟਰੀ ਡੈਸ਼ਬੋਰਡ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
  'pmo.backToAll': 'ਸਾਰੇ MPs ਵੱਲ ਵਾਪਸ',
  'stats.mps': 'ਸੰਸਦ ਮੈਂਬਰ',
  'stats.requests': 'ਨਾਗਰਿਕ ਬੇਨਤੀਆਂ (ਰਾਸ਼ਟਰੀ)',
  'stats.sanctioned': 'ਮਨਜ਼ੂਰਸ਼ੁਦਾ ਪ੍ਰੋਜੈਕਟ',
  'stats.unresolvedRate': 'ਅਣਸੁਲਝੀ ਦਰ',

  // MP directory
  'dir.searchPlaceholder': 'MP, ਹਲਕਾ ਜਾਂ ਰਾਜ ਖੋਜੋ…',
  'dir.allStates': 'ਸਾਰੇ ਰਾਜ',
  'dir.onlyWithRequests': 'ਸਿਰਫ ਬੇਨਤੀਆਂ ਵਾਲੇ MPs',
  'dir.showing': '{total} ਵਿੱਚੋਂ {shown} MPs ਵਿਖਾਏ ਜਾ ਰਹੇ ਹਨ',
  'dir.noMatch': 'ਇਹਨਾਂ ਫਿਲਟਰਾਂ ਨਾਲ ਕੋਈ MP ਮੇਲ ਨਹੀਂ ਖਾਂਦਾ।',
  'dir.sortPrefix': 'ਲੜੀਬੰਦੀ: {label}',
  'dir.sortRequests': 'ਸਭ ਤੋਂ ਵੱਧ ਬੇਨਤੀਆਂ',
  'dir.sortWork': 'ਸਭ ਤੋਂ ਵੱਧ ਕੰਮ ਹੋਇਆ (ਮਨਜ਼ੂਰਸ਼ੁਦਾ)',
  'dir.sortResolved': 'ਸਭ ਤੋਂ ਵੱਧ ਸੁਲਝੀਆਂ',
  'dir.sortPending': 'ਸਭ ਤੋਂ ਵੱਧ ਬਕਾਇਆ',
  'dir.sortBacklog': 'ਸਭ ਤੋਂ ਵੱਧ ਬੈਕਲਾਗ %',
  'dir.sortName': 'ਨਾਮ (A–Z)',
  'dir.colMember': 'ਮੈਂਬਰ',
  'dir.colState': 'ਰਾਜ',
  'dir.colRequests': 'ਬੇਨਤੀਆਂ',
  'dir.colResolved': 'ਸੁਲਝੀਆਂ',
  'dir.colPending': 'ਬਕਾਇਆ',
  'dir.colDone': 'ਪੂਰਾ',
  'card.requests': 'ਬੇਨਤੀਆਂ',
  'card.resolved': 'ਸੁਲਝੀਆਂ',
  'card.pending': 'ਬਕਾਇਆ',
  'card.done': 'ਪੂਰਾ',

  // Map popup
  'map.issue': '{cat} ਸਮੱਸਿਆ',
  'map.priority': 'ਤਰਜੀਹ: {score}/100',
  'map.status': 'ਸਥਿਤੀ: {status}',

  // Enumerated: categories
  'category.Water': 'ਪਾਣੀ',
  'category.Roads': 'ਸੜਕਾਂ',
  'category.Education': 'ਸਿੱਖਿਆ',
  'category.Health': 'ਸਿਹਤ',
  'category.Sanitation': 'ਸਫਾਈ',
  'category.Public Spaces': 'ਜਨਤਕ ਥਾਵਾਂ',
  'category.Electricity': 'ਬਿਜਲੀ',
  'category.Safety': 'ਸੁਰੱਖਿਆ',
  'category.General': 'ਆਮ',

  // Enumerated: statuses
  'status.Submitted': 'ਜਮ੍ਹਾਂ ਕੀਤੀ',
  'status.Reviewed': 'ਸਮੀਖਿਆ ਕੀਤੀ',
  'status.Approved': 'ਮਨਜ਼ੂਰ',
  'status.Rejected': 'ਰੱਦ',
  'status.Proposed': 'ਪ੍ਰਸਤਾਵਿਤ',
  'status.Sanctioned': 'ਮਨਜ਼ੂਰਸ਼ੁਦਾ',
  'status.Work In Progress': 'ਕੰਮ ਜਾਰੀ ਹੈ',
  'status.Completed': 'ਮੁਕੰਮਲ',

  // Enumerated: sentiment
  'sentiment.Positive': 'ਸਕਾਰਾਤਮਕ',
  'sentiment.Negative': 'ਨਕਾਰਾਤਮਕ',
  'sentiment.Neutral': 'ਨਿਰਪੱਖ',
};

export default pa;

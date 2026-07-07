// Odia (ଓଡ଼ିଆ) translation. Mirrors the keys in en.ts.
// Placeholders look like {var} and must be preserved exactly.
const or: Record<string, string> = {
  // Brand / nav
  'brand.tagline': 'ଭାରତ · ଜନତାଙ୍କ ପ୍ରାଥମିକତା',
  'nav.portal': 'ନାଗରିକ ପୋର୍ଟାଲ',
  'nav.myConstituency': 'ମୋର ନିର୍ବାଚନ ମଣ୍ଡଳୀ',
  'nav.pmoCommand': 'PMO କମାଣ୍ଡ',
  'nav.staffLogin': 'କର୍ମଚାରୀ ଲଗଇନ',
  'nav.signOut': 'ସାଇନ ଆଉଟ',
  'role.pmo': 'PMO · ସୁପର ଆଡମିନ',
  'role.mp': 'ସଂସଦ ସଦସ୍ୟ',
  'lang.label': 'ଭାଷା',

  // Common / picker
  'common.selectState': 'ରାଜ୍ୟ ବାଛନ୍ତୁ…',
  'common.selectConstituency': 'ନିର୍ବାଚନ ମଣ୍ଡଳୀ ବାଛନ୍ତୁ…',
  'common.pickStateFirst': 'ପ୍ରଥମେ ଏକ ରାଜ୍ୟ ବାଛନ୍ତୁ',
  'common.loading': 'ଲୋଡ ହେଉଛି…',
  'picker.stateLabel': 'ରାଜ୍ୟ / UT',
  'picker.constituencyLabel': 'ନିର୍ବାଚନ ମଣ୍ଡଳୀ',
  'auth.verifying': 'ପ୍ରବେଶ ଯାଞ୍ଚ କରାଯାଉଛି…',

  // Portal
  'portal.heroA': 'ଆପଣଙ୍କ ସ୍ୱର ଉଠାନ୍ତୁ,',
  'portal.heroB': 'ଆପଣଙ୍କ ନିର୍ବାଚନ ମଣ୍ଡଳୀକୁ ଗଢ଼ନ୍ତୁ',
  'portal.subtitle':
    'ଟେକ୍ସଟ, ଭଏସ କିମ୍ବା ଫଟୋ ମାଧ୍ୟମରେ ସ୍ଥାନୀୟ ସମସ୍ୟା ରିପୋର୍ଟ କରନ୍ତୁ। ଆପଣଙ୍କ ଅନୁରୋଧ ସିଧାସଳଖ ଆପଣଙ୍କ ନିର୍ବାଚିତ ସଂସଦ ସଦସ୍ୟଙ୍କ ପାଖକୁ ଯାଏ।',
  'portal.step1': '1 · ଆପଣ କେଉଁଠାରେ ରୁହନ୍ତି?',
  'portal.step2': '2 · ସମସ୍ୟା ବର୍ଣ୍ଣନା କରନ୍ତୁ',
  'portal.detecting': 'GPS ରୁ ଚିହ୍ନଟ କରାଯାଉଛି…',
  'portal.autofilled': 'ଆପଣଙ୍କ ଅବସ୍ଥାନରୁ ସ୍ୱୟଂ-ପୂରଣ କରାଯାଇଛି — ଦୟାକରି ନିଶ୍ଚିତ କରନ୍ତୁ',
  'portal.routedTo': 'ଆପଣଙ୍କ ଅନୁରୋଧ ପଠାଯିବ',
  'portal.enableLocation': 'ଆପଣଙ୍କ MLA ଏବଂ ସ୍ଥାନୀୟ ସଂସ୍ଥାକୁ ମଧ୍ୟ ପଠାଇବା ପାଇଁ ଅବସ୍ଥାନ ସକ୍ରିୟ କରନ୍ତୁ।',
  'portal.recordLabel': 'ଭଏସ ଅନୁରୋଧ ରେକର୍ଡ କରନ୍ତୁ (ଯେକୌଣସି ଭାରତୀୟ ଭାଷା)',
  'portal.tapToRecord': 'ରେକର୍ଡ କରିବାକୁ ଟାପ କରନ୍ତୁ',
  'portal.recording': 'ରେକର୍ଡ ହେଉଛି…',
  'portal.voiceRecorded': 'ଭଏସ କ୍ଲିପ ରେକର୍ଡ ହୋଇଛି',
  'portal.voiceLangs': 'ହିନ୍ଦୀ, ତାମିଲ, ବଙ୍ଗଳା, ଇଂରାଜୀ ଓ ଅଧିକ',
  'portal.lengthLimit': 'ଅବଧି: {duration}s (60s ସୀମା)',
  'portal.readyToSubmit': 'ଗ୍ରହଣ କରାଗଲା। ଦାଖଲ କରିବାକୁ ପ୍ରସ୍ତୁତ।',
  'portal.orWrite': 'କିମ୍ବା ଆପଣଙ୍କ ଅନୁରୋଧ ଲେଖନ୍ତୁ',
  'portal.writePlaceholder':
    'ଉଦାହରଣ ସ୍ୱରୂପ, ବଜାର ପାଖ ଜଳ ପାଇପଲାଇନ ଭାଙ୍ଗିଯାଇଛି; ମୁଖ୍ୟ ରାସ୍ତାର ଷ୍ଟ୍ରିଟଲାଇଟ କାମ କରୁନାହିଁ…',
  'portal.phone': 'ଫୋନ (ଐଚ୍ଛିକ)',
  'portal.phonePlaceholder': 'ଉଦାହରଣ ସ୍ୱରୂପ, +91 98XXXXXXXX',
  'portal.photo': 'ଫଟୋ (ଐଚ୍ଛିକ)',
  'portal.attachImage': 'ଛବି ସଂଲଗ୍ନ କରନ୍ତୁ',
  'portal.gpsCaptured': 'GPS ଗ୍ରହଣ କରାଗଲା ({lat}, {lng})',
  'portal.gpsWaiting': 'GPS ପାଇଁ ଅପେକ୍ଷା କରାଯାଉଛି…',
  'portal.submit': 'ମୋ MP ଙ୍କୁ ଦାଖଲ କରନ୍ତୁ',
  'portal.analysing': 'AI ସହିତ ବିଶ୍ଳେଷଣ କରାଯାଉଛି…',
  'portal.selectConstituencyAlert':
    'ଦୟାକରି ଆପଣଙ୍କ ରାଜ୍ୟ ଏବଂ ନିର୍ବାଚନ ମଣ୍ଡଳୀ ବାଛନ୍ତୁ ଯାହା ଫଳରେ ଆମେ ଆପଣଙ୍କ ଅନୁରୋଧକୁ ସଠିକ MP ଙ୍କ ପାଖକୁ ପଠାଇ ପାରିବୁ।',
  'portal.describeAlert': 'ଦୟାକରି ଏକ ବର୍ଣ୍ଣନା ଦିଅନ୍ତୁ କିମ୍ବା ଏକ ଭଏସ ମେସେଜ ରେକର୍ଡ କରନ୍ତୁ।',
  'portal.submitFail': 'ପରାମର୍ଶ ଦାଖଲ କରିବାରେ ବିଫଳ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  'portal.successTitle': 'ଆପଣଙ୍କ ଅନୁରୋଧ ପଞ୍ଜୀକୃତ ହୋଇଛି!',
  'portal.followedUp': 'ଆପଣଙ୍କ ଅନୁରୋଧ ଏହିସବୁ ମାଧ୍ୟମରେ ଅନୁସରଣ କରାଯାଉଛି:',
  'portal.routedToMp': 'ଆପଣଙ୍କ MP ଙ୍କୁ ପଠାଯାଇଛି',
  'portal.yourReport': 'ଆପଣଙ୍କ ରିପୋର୍ଟ',
  'portal.aiCategory': 'AI ବର୍ଗ',
  'portal.sentimentLabel': 'ଭାବନା',
  'portal.priorityScore': 'ପ୍ରାଥମିକତା ସ୍କୋର',
  'portal.submitAnother': 'ଆଉ ଏକ ଅନୁରୋଧ ଦାଖଲ କରନ୍ତୁ',

  // Routing tree
  'tree.mpTier': 'ସଂସଦ · ଲୋକ ସଭା (MP)',
  'tree.mlaTier': 'ରାଜ୍ୟ · ବିଧାନ ସଭା (MLA)',
  'tree.localTier': 'ସ୍ଥାନୀୟ ସଂସ୍ଥା',
  'tree.mpFallback': 'ସଂସଦ ସଦସ୍ୟ',
  'tree.mlaUpdating': 'MLA — ରେକର୍ଡ ଅଦ୍ୟତନ କରାଯାଉଛି',
  'tree.noInfo': 'ଆପଣଙ୍କ ଅନୁରୋଧ କିଏ ପରିଚାଳନା କରିବେ ତାହା ଦେଖିବାକୁ ଅବସ୍ଥାନ ସକ୍ରିୟ କରନ୍ତୁ।',

  // Login
  'login.title': 'ସରକାରୀ ସାଇନ ଇନ',
  'login.subtitle': 'PMO ଅଧିକାରୀ ଏବଂ ସଂସଦ ସଦସ୍ୟଙ୍କ ପାଇଁ।',
  'login.email': 'ଇମେଲ ଠିକଣା',
  'login.password': 'ପାସୱାର୍ଡ',
  'login.signIn': 'ସାଇନ ଇନ',
  'login.signingIn': 'ସାଇନ ଇନ କରାଯାଉଛି…',
  'login.invalid': 'ଅବୈଧ ଇମେଲ କିମ୍ବା ପାସୱାର୍ଡ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
  'login.demoAccounts': 'ଡେମୋ ଆକାଉଣ୍ଟ',

  // MP dashboard
  'dash.mpBadge': 'ସଂସଦ ସଦସ୍ୟ · 18ଶ ଲୋକ ସଭା',
  'dash.requests': 'ଅନୁରୋଧ',
  'dash.unresolved': 'ଅସମାଧିତ',
  'dash.sanctioned': 'ମଞ୍ଜୁର',
  'dash.wikipedia': 'Wikipedia',
  'dash.syncData': 'ଡାଟା ସିଙ୍କ',
  'dash.loading': 'ନିର୍ବାଚନ ମଣ୍ଡଳୀ ମେଟ୍ରିକ୍ସ ଲୋଡ ହେଉଛି…',
  'dash.liveMap': 'ଲାଇଭ ଅଭିଯୋଗ ମାନଚିତ୍ର',
  'dash.localReps': 'ସ୍ଥାନୀୟ ପ୍ରତିନିଧି — ବିଧାନସଭା ସେଗମେଣ୍ଟ (MLA)',
  'dash.localRepsSub':
    'ଏହି ସଂସଦୀୟ ଆସନର ଅନୁରୋଧଗୁଡ଼ିକ ସମ୍ପୃକ୍ତ MLA ଏବଂ ସ୍ଥାନୀୟ ସଂସ୍ଥାକୁ ମଧ୍ୟ ପଠାଯାଏ।',
  'dash.mlaToUpdate': 'MLA — ଅଦ୍ୟତନ କରାଯିବ',

  // Analytics
  'analytics.totalSuggestions': 'ମୋଟ ପରାମର୍ଶ',
  'analytics.recommendedProjects': 'ସୁପାରିଶ କରାଯାଇଥିବା ପ୍ରକଳ୍ପ',
  'analytics.unresolvedRate': 'ଅସମାଧିତ ହାର',
  'analytics.sectorDemand': 'କ୍ଷେତ୍ର ଅନୁସାରେ ଅଭିଯୋଗ ଚାହିଦା (ନିର୍ବାଚନ ମଣ୍ଡଳୀ ମେଟ୍ରିକ୍ସ)',
  'analytics.noDemand': 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଚାହିଦା ଅନୁରୋଧ ପଞ୍ଜୀକୃତ ହୋଇନାହିଁ।',

  // Project prioritizer
  'proj.title': 'AI-ପ୍ରାଥମିକତା ପ୍ରାପ୍ତ ବିକାଶ କାର୍ଯ୍ୟ',
  'proj.subtitle': 'MPLADS ପାଣ୍ଠି ବଣ୍ଟନ ଜରୁରୀତା ମେଟ୍ରିକ୍ସ ଅନୁସାରେ ଗତିଶୀଳ ଭାବେ କ୍ରମବଦ୍ଧ।',
  'proj.runAI': 'AI ପ୍ରାଥମିକତା ଚଲାନ୍ତୁ',
  'proj.ranking': 'କ୍ରମବଦ୍ଧ କରାଯାଉଛି…',
  'proj.none1': 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ସୁପାରିଶ କରାଯାଇଥିବା ପ୍ରକଳ୍ପ ସୃଷ୍ଟି ହୋଇନାହିଁ।',
  'proj.none2': 'ନାଗରିକ ଚାହିଦା ସ୍କାନ କରିବାକୁ ଉପରେ "AI ପ୍ରାଥମିକତା ଚଲାନ୍ତୁ" କ୍ଲିକ କରନ୍ତୁ।',
  'proj.priority': 'ପ୍ରାଥମିକତା: {score}',
  'proj.estCost': 'ଆନୁମାନିକ ଖର୍ଚ୍ଚ',
  'proj.supporting': 'ସମର୍ଥନକାରୀ ଆବେଦନ',
  'proj.citizens': '{count} ନାଗରିକ',
  'proj.sanctionWork': 'କାର୍ଯ୍ୟ ମଞ୍ଜୁର କରନ୍ତୁ',
  'proj.categoryLabel': 'ବର୍ଗ: {cat}',
  'proj.aiDone': 'AI ପ୍ରାଥମିକତା ମଡେଲ ସମ୍ପୂର୍ଣ୍ଣ ହେଲା! ନୂଆ ପ୍ରକଳ୍ପ ପ୍ରସ୍ତାବ ସୃଷ୍ଟି ହୋଇଛି।',
  'proj.aiFail': 'ପ୍ରକଳ୍ପ ପରାମର୍ଶ ସୃଷ୍ଟି କରିବାରେ ବିଫଳ।',
  'proj.updateFail': 'ପ୍ରକଳ୍ପ ସ୍ଥିତି ଅଦ୍ୟତନ କରିବାରେ ବିଫଳ।',

  // PMO
  'pmo.title': 'PMO କମାଣ୍ଡ ସେଣ୍ଟର',
  'pmo.subtitle': 'ସମସ୍ତ {count} ନିର୍ବାଚନ ମଣ୍ଡଳୀ ଏବଂ ସେମାନଙ୍କ ସଂସଦ ସଦସ୍ୟଙ୍କର ଜାତୀୟ ତଦାରଖ।',
  'pmo.loading': 'ଜାତୀୟ ଡ୍ୟାସବୋର୍ଡ ଲୋଡ ହେଉଛି…',
  'pmo.backToAll': 'ସମସ୍ତ MP ଙ୍କ ପାଖକୁ ଫେରନ୍ତୁ',
  'stats.mps': 'ସଂସଦ ସଦସ୍ୟ',
  'stats.requests': 'ନାଗରିକ ଅନୁରୋଧ (ଜାତୀୟ)',
  'stats.sanctioned': 'ମଞ୍ଜୁର ପ୍ରକଳ୍ପ',
  'stats.unresolvedRate': 'ଅସମାଧିତ ହାର',

  // MP directory
  'dir.searchPlaceholder': 'MP, ନିର୍ବାଚନ ମଣ୍ଡଳୀ କିମ୍ବା ରାଜ୍ୟ ଖୋଜନ୍ତୁ…',
  'dir.allStates': 'ସମସ୍ତ ରାଜ୍ୟ',
  'dir.onlyWithRequests': 'କେବଳ ଅନୁରୋଧ ଥିବା MP',
  'dir.showing': '{total} ଟି MP ମଧ୍ୟରୁ {shown} ଟି ଦେଖାଯାଉଛି',
  'dir.noMatch': 'ଏହି ଫିଲ୍ଟର ସହିତ କୌଣସି MP ମେଳ ଖାଉନାହିଁ।',
  'dir.sortPrefix': 'କ୍ରମ: {label}',
  'dir.sortRequests': 'ସର୍ବାଧିକ ଅନୁରୋଧ',
  'dir.sortWork': 'ସର୍ବାଧିକ କାର୍ଯ୍ୟ ସମ୍ପନ୍ନ (ମଞ୍ଜୁର)',
  'dir.sortResolved': 'ସର୍ବାଧିକ ସମାଧାନ',
  'dir.sortPending': 'ସର୍ବାଧିକ ବିଚାରାଧୀନ',
  'dir.sortBacklog': 'ସର୍ବୋଚ୍ଚ ବକେୟା %',
  'dir.sortName': 'ନାମ (A–Z)',
  'dir.colMember': 'ସଦସ୍ୟ',
  'dir.colState': 'ରାଜ୍ୟ',
  'dir.colRequests': 'ଅନୁରୋଧ',
  'dir.colResolved': 'ସମାଧାନ',
  'dir.colPending': 'ବିଚାରାଧୀନ',
  'dir.colDone': 'ସମ୍ପନ୍ନ',
  'card.requests': 'ଅନୁରୋଧ',
  'card.resolved': 'ସମାଧାନ',
  'card.pending': 'ବିଚାରାଧୀନ',
  'card.done': 'ସମ୍ପନ୍ନ',

  // Map popup
  'map.issue': '{cat} ସମସ୍ୟା',
  'map.priority': 'ପ୍ରାଥମିକତା: {score}/100',
  'map.status': 'ସ୍ଥିତି: {status}',

  // Enumerated: categories
  'category.Water': 'ଜଳ',
  'category.Roads': 'ରାସ୍ତା',
  'category.Education': 'ଶିକ୍ଷା',
  'category.Health': 'ସ୍ୱାସ୍ଥ୍ୟ',
  'category.Sanitation': 'ପରିମଳ',
  'category.Public Spaces': 'ସାର୍ବଜନୀନ ସ୍ଥାନ',
  'category.Electricity': 'ବିଦ୍ୟୁତ',
  'category.Safety': 'ସୁରକ୍ଷା',
  'category.General': 'ସାଧାରଣ',

  // Enumerated: statuses
  'status.Submitted': 'ଦାଖଲ ହୋଇଛି',
  'status.Reviewed': 'ସମୀକ୍ଷା ହୋଇଛି',
  'status.Approved': 'ଅନୁମୋଦିତ',
  'status.Rejected': 'ପ୍ରତ୍ୟାଖ୍ୟାତ',
  'status.Proposed': 'ପ୍ରସ୍ତାବିତ',
  'status.Sanctioned': 'ମଞ୍ଜୁର',
  'status.Work In Progress': 'କାର୍ଯ୍ୟ ଚାଲିଛି',
  'status.Completed': 'ସମ୍ପୂର୍ଣ୍ଣ',

  // Enumerated: sentiment
  'sentiment.Positive': 'ସକାରାତ୍ମକ',
  'sentiment.Negative': 'ନକାରାତ୍ମକ',
  'sentiment.Neutral': 'ନିରପେକ୍ଷ',
};

export default or;

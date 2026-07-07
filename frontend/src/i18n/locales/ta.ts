// Tamil (தமிழ்) locale. Mirrors the keys in en.ts.
// Placeholders look like {var} and are preserved verbatim.
const ta: Record<string, string> = {
  // Brand / nav
  'brand.tagline': 'பாரதம் · மக்களின் முன்னுரிமைகள்',
  'nav.portal': 'குடிமக்கள் வலைவாசல்',
  'nav.myConstituency': 'எனது தொகுதி',
  'nav.pmoCommand': 'PMO கட்டளை மையம்',
  'nav.staffLogin': 'பணியாளர் உள்நுழைவு',
  'nav.signOut': 'வெளியேறு',
  'role.pmo': 'PMO · முதன்மை நிர்வாகி',
  'role.mp': 'நாடாளுமன்ற உறுப்பினர்',
  'lang.label': 'மொழி',

  // Common / picker
  'common.selectState': 'மாநிலத்தைத் தேர்ந்தெடுக்கவும்…',
  'common.selectConstituency': 'தொகுதியைத் தேர்ந்தெடுக்கவும்…',
  'common.pickStateFirst': 'முதலில் ஒரு மாநிலத்தைத் தேர்வு செய்யவும்',
  'common.loading': 'ஏற்றுகிறது…',
  'picker.stateLabel': 'மாநிலம் / யூனியன் பிரதேசம்',
  'picker.constituencyLabel': 'தொகுதி',
  'auth.verifying': 'அணுகலைச் சரிபார்க்கிறது…',

  // Portal
  'portal.heroA': 'உங்கள் குரலை எழுப்புங்கள்,',
  'portal.heroB': 'உங்கள் தொகுதியை வடிவமைக்குங்கள்',
  'portal.subtitle':
    'உள்ளூர் பிரச்சினைகளை உரை, குரல் அல்லது புகைப்படம் மூலம் தெரிவிக்கவும். உங்கள் கோரிக்கை நேரடியாக நீங்கள் தேர்ந்தெடுத்த நாடாளுமன்ற உறுப்பினருக்குச் செல்கிறது.',
  'portal.step1': '1 · நீங்கள் எங்கு வசிக்கிறீர்கள்?',
  'portal.step2': '2 · பிரச்சினையை விவரிக்கவும்',
  'portal.detecting': 'GPS மூலம் கண்டறிகிறது…',
  'portal.autofilled': 'உங்கள் இருப்பிடத்திலிருந்து தானாக நிரப்பப்பட்டது — தயவுசெய்து உறுதிப்படுத்தவும்',
  'portal.routedTo': 'உங்கள் கோரிக்கை பின்வருவோருக்கு அனுப்பப்படும்',
  'portal.enableLocation': 'உங்கள் MLA மற்றும் உள்ளூர் அமைப்புக்கும் அனுப்ப இருப்பிடத்தை இயக்கவும்.',
  'portal.recordLabel': 'குரல் கோரிக்கையைப் பதிவு செய்யவும் (எந்த இந்திய மொழியிலும்)',
  'portal.tapToRecord': 'பதிவு செய்ய தட்டவும்',
  'portal.recording': 'பதிவு செய்கிறது…',
  'portal.voiceRecorded': 'குரல் பதிவு செய்யப்பட்டது',
  'portal.voiceLangs': 'இந்தி, தமிழ், வங்காளம், ஆங்கிலம் மற்றும் பல',
  'portal.lengthLimit': 'நீளம்: {duration}வி (60வி வரம்பு)',
  'portal.readyToSubmit': 'பதிவு செய்யப்பட்டது. சமர்ப்பிக்கத் தயார்.',
  'portal.orWrite': 'அல்லது உங்கள் கோரிக்கையை எழுதவும்',
  'portal.writePlaceholder':
    'எ.கா. சந்தைக்கு அருகில் உள்ள நீர்க்குழாய் உடைந்துள்ளது; பிரதான சாலையில் தெருவிளக்குகள் வேலை செய்யவில்லை…',
  'portal.phone': 'தொலைபேசி (விருப்பம்)',
  'portal.phonePlaceholder': 'எ.கா. +91 98XXXXXXXX',
  'portal.photo': 'புகைப்படம் (விருப்பம்)',
  'portal.attachImage': 'படத்தை இணைக்கவும்',
  'portal.gpsCaptured': 'GPS பதிவு செய்யப்பட்டது ({lat}, {lng})',
  'portal.gpsWaiting': 'GPS-க்காக காத்திருக்கிறது…',
  'portal.submit': 'எனது MP-க்கு சமர்ப்பிக்கவும்',
  'portal.analysing': 'AI மூலம் பகுப்பாய்வு செய்கிறது…',
  'portal.selectConstituencyAlert':
    'உங்கள் கோரிக்கையை சரியான MP-க்கு அனுப்ப, தயவுசெய்து உங்கள் மாநிலம் மற்றும் தொகுதியைத் தேர்ந்தெடுக்கவும்.',
  'portal.describeAlert': 'தயவுசெய்து ஒரு விளக்கத்தை உள்ளிடவும் அல்லது ஒரு குரல் செய்தியைப் பதிவு செய்யவும்.',
  'portal.submitFail': 'பரிந்துரையை சமர்ப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'portal.successTitle': 'உங்கள் கோரிக்கை பதிவு செய்யப்பட்டது!',
  'portal.followedUp': 'உங்கள் கோரிக்கை பின்வருவனவற்றின் மூலம் பின்தொடரப்படுகிறது:',
  'portal.routedToMp': 'உங்கள் MP-க்கு அனுப்பப்பட்டது',
  'portal.yourReport': 'உங்கள் புகார்',
  'portal.aiCategory': 'AI வகை',
  'portal.sentimentLabel': 'உணர்வுநிலை',
  'portal.priorityScore': 'முன்னுரிமை மதிப்பெண்',
  'portal.submitAnother': 'மற்றொரு கோரிக்கையை சமர்ப்பிக்கவும்',

  // Routing tree
  'tree.mpTier': 'நாடாளுமன்றம் · Lok Sabha (MP)',
  'tree.mlaTier': 'மாநிலம் · Vidhan Sabha (MLA)',
  'tree.localTier': 'உள்ளூர் அமைப்பு',
  'tree.mpFallback': 'நாடாளுமன்ற உறுப்பினர்',
  'tree.mlaUpdating': 'MLA — பதிவு புதுப்பிக்கப்படுகிறது',
  'tree.noInfo': 'உங்கள் கோரிக்கையை யார் கையாளுவார்கள் என்பதைக் காண இருப்பிடத்தை இயக்கவும்.',

  // Login
  'login.title': 'அரசு உள்நுழைவு',
  'login.subtitle': 'PMO அதிகாரிகள் மற்றும் நாடாளுமன்ற உறுப்பினர்களுக்கானது.',
  'login.email': 'மின்னஞ்சல் முகவரி',
  'login.password': 'கடவுச்சொல்',
  'login.signIn': 'உள்நுழைக',
  'login.signingIn': 'உள்நுழைகிறது…',
  'login.invalid': 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல். மீண்டும் முயற்சிக்கவும்.',
  'login.demoAccounts': 'மாதிரி கணக்குகள்',

  // MP dashboard
  'dash.mpBadge': 'நாடாளுமன்ற உறுப்பினர் · 18வது LOK SABHA',
  'dash.requests': 'கோரிக்கைகள்',
  'dash.unresolved': 'தீர்க்கப்படாதவை',
  'dash.sanctioned': 'அனுமதிக்கப்பட்டவை',
  'dash.wikipedia': 'Wikipedia',
  'dash.syncData': 'தரவு ஒத்திசைவு',
  'dash.loading': 'தொகுதி அளவீடுகளை ஏற்றுகிறது…',
  'dash.liveMap': 'நேரடி குறைதீர் வரைபடம்',
  'dash.localReps': 'உள்ளூர் பிரதிநிதிகள் — சட்டமன்றப் பிரிவுகள் (MLAs)',
  'dash.localRepsSub':
    'இந்த நாடாளுமன்றத் தொகுதியில் உள்ள கோரிக்கைகள் சம்பந்தப்பட்ட MLA மற்றும் உள்ளூர் அமைப்புக்கும் அனுப்பப்படுகின்றன.',
  'dash.mlaToUpdate': 'MLA — புதுப்பிக்கப்பட வேண்டும்',

  // Analytics
  'analytics.totalSuggestions': 'மொத்த பரிந்துரைகள்',
  'analytics.recommendedProjects': 'பரிந்துரைக்கப்பட்ட திட்டங்கள்',
  'analytics.unresolvedRate': 'தீர்க்கப்படாத விகிதம்',
  'analytics.sectorDemand': 'துறைவாரியான குறைதீர் தேவை (தொகுதி அளவீடுகள்)',
  'analytics.noDemand': 'இதுவரை எந்த தேவைக் கோரிக்கையும் பதிவு செய்யப்படவில்லை.',

  // Project prioritizer
  'proj.title': 'AI-முன்னுரிமைப்படுத்தப்பட்ட வளர்ச்சிப் பணிகள்',
  'proj.subtitle': 'MPLADS நிதி ஒதுக்கீடுகள் அவசர அளவீடுகளால் மாறும் வகையில் தரவரிசைப்படுத்தப்பட்டன.',
  'proj.runAI': 'AI முன்னுரிமையை இயக்கவும்',
  'proj.ranking': 'தரவரிசைப்படுத்துகிறது…',
  'proj.none1': 'இதுவரை பரிந்துரைக்கப்பட்ட திட்டங்கள் எதுவும் உருவாக்கப்படவில்லை.',
  'proj.none2': 'குடிமக்கள் தேவைகளை ஆராய மேலே உள்ள "AI முன்னுரிமையை இயக்கவும்" என்பதைக் கிளிக் செய்யவும்.',
  'proj.priority': 'முன்னுரிமை: {score}',
  'proj.estCost': 'மதிப்பிடப்பட்ட செலவு',
  'proj.supporting': 'ஆதரவு மனுக்கள்',
  'proj.citizens': '{count} குடிமக்கள்',
  'proj.sanctionWork': 'பணியை அனுமதிக்கவும்',
  'proj.categoryLabel': 'வகை: {cat}',
  'proj.aiDone': 'AI முன்னுரிமை மாதிரி முடிந்தது! புதிய திட்ட முன்மொழிவுகள் உருவாக்கப்பட்டன.',
  'proj.aiFail': 'திட்டப் பரிந்துரைகளை உருவாக்க முடியவில்லை.',
  'proj.updateFail': 'திட்ட நிலையைப் புதுப்பிக்க முடியவில்லை.',

  // PMO
  'pmo.title': 'PMO கட்டளை மையம்',
  'pmo.subtitle': 'அனைத்து {count} தொகுதிகள் மற்றும் அவற்றின் நாடாளுமன்ற உறுப்பினர்களின் தேசிய மேற்பார்வை.',
  'pmo.loading': 'தேசிய டாஷ்போர்டை ஏற்றுகிறது…',
  'pmo.backToAll': 'அனைத்து MP-களுக்கும் திரும்பு',
  'stats.mps': 'நாடாளுமன்ற உறுப்பினர்கள்',
  'stats.requests': 'குடிமக்கள் கோரிக்கைகள் (தேசிய)',
  'stats.sanctioned': 'அனுமதிக்கப்பட்ட திட்டங்கள்',
  'stats.unresolvedRate': 'தீர்க்கப்படாத விகிதம்',

  // MP directory
  'dir.searchPlaceholder': 'MP, தொகுதி அல்லது மாநிலத்தைத் தேடுங்கள்…',
  'dir.allStates': 'அனைத்து மாநிலங்கள்',
  'dir.onlyWithRequests': 'கோரிக்கைகள் உள்ள MP-கள் மட்டும்',
  'dir.showing': '{total} MP-களில் {shown} காட்டப்படுகிறது',
  'dir.noMatch': 'இந்த வடிகட்டிகளுக்கு எந்த MP-யும் பொருந்தவில்லை.',
  'dir.sortPrefix': 'வரிசைப்படுத்து: {label}',
  'dir.sortRequests': 'அதிக கோரிக்கைகள்',
  'dir.sortWork': 'அதிக பணி முடிக்கப்பட்டது (அனுமதிக்கப்பட்டது)',
  'dir.sortResolved': 'அதிகம் தீர்க்கப்பட்டது',
  'dir.sortPending': 'அதிகம் நிலுவையில் உள்ளது',
  'dir.sortBacklog': 'அதிக நிலுவை %',
  'dir.sortName': 'பெயர் (அ–ஃ)',
  'dir.colMember': 'உறுப்பினர்',
  'dir.colState': 'மாநிலம்',
  'dir.colRequests': 'கோரிக்கைகள்',
  'dir.colResolved': 'தீர்க்கப்பட்டது',
  'dir.colPending': 'நிலுவையில்',
  'dir.colDone': 'முடிந்தது',
  'card.requests': 'கோரிக்கைகள்',
  'card.resolved': 'தீர்க்கப்பட்டது',
  'card.pending': 'நிலுவையில்',
  'card.done': 'முடிந்தது',

  // Map popup
  'map.issue': '{cat} பிரச்சினை',
  'map.priority': 'முன்னுரிமை: {score}/100',
  'map.status': 'நிலை: {status}',

  // Enumerated: categories
  'category.Water': 'நீர்',
  'category.Roads': 'சாலைகள்',
  'category.Education': 'கல்வி',
  'category.Health': 'சுகாதாரம்',
  'category.Sanitation': 'துப்புரவு',
  'category.Public Spaces': 'பொது இடங்கள்',
  'category.Electricity': 'மின்சாரம்',
  'category.Safety': 'பாதுகாப்பு',
  'category.General': 'பொது',

  // Enumerated: statuses
  'status.Submitted': 'சமர்ப்பிக்கப்பட்டது',
  'status.Reviewed': 'மதிப்பாய்வு செய்யப்பட்டது',
  'status.Approved': 'அங்கீகரிக்கப்பட்டது',
  'status.Rejected': 'நிராகரிக்கப்பட்டது',
  'status.Proposed': 'முன்மொழியப்பட்டது',
  'status.Sanctioned': 'அனுமதிக்கப்பட்டது',
  'status.Work In Progress': 'பணி நடைபெறுகிறது',
  'status.Completed': 'நிறைவடைந்தது',

  // Enumerated: sentiment
  'sentiment.Positive': 'நேர்மறை',
  'sentiment.Negative': 'எதிர்மறை',
  'sentiment.Neutral': 'நடுநிலை',
};

export default ta;

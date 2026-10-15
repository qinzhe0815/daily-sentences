export const catalog = {
  questionSource: ["出题来源", "Question source", "Source des questions"],
  questionSourceAuto: ["默认／自动选择", "Default / automatic", "Par défaut / automatique"],
  questionSourceLocal: ["本地题库", "Local question bank", "Banque locale"],
  questionSourceAI: ["AI", "AI", "IA"],
  questionSourceHelp: [
    "自动选择优先使用本地题库，缺题时由 AI 补充；选择本地题库时，缺题会提示，不会自动改用 AI。",
    "Automatic selection tries the local bank first, then AI. Local-only selection reports a shortage without switching to AI.",
    "Le mode automatique privilégie la banque locale, puis l’IA. Le mode local signale un manque sans passer à l’IA.",
  ],
  corpusUserQuality: [
    "按用户要求视为人工检查通过；等级仍待实际学习者校准",
    "Treated as human-check passed at the user’s direction; learner calibration pending",
    "Considéré comme vérifié à la demande de l’utilisateur ; calibrage avec des apprenants à faire",
  ],
  corpusHumanQuality: [
    "独立人工审核通过；等级仍待实际学习者校准",
    "Human review accepted; level still awaits learner calibration",
    "Révision humaine acceptée ; niveau à calibrer avec des apprenants",
  ],
  corpusSource: [
    "本地语料（试用）",
    "Local corpus (pilot)",
    "Corpus local (pilote)",
  ],
  corpusQuality: [
    "AI 编选；等级暂定，独立人工审核待完成",
    "AI curated; provisional level, independent human review pending",
    "Sélection IA ; niveau provisoire, révision humaine indépendante à faire",
  ],
  aiSource: ["AI 生成", "AI generated", "Généré par IA"],
  assessmentHistory: [
    "诊断记录",
    "Assessment history",
    "Historique des bilans",
  ],
  collectionEyebrow: [
    "你的表达收藏",
    "YOUR PERSONAL COLLECTION",
    "VOTRE COLLECTION PERSONNELLE",
  ],
  settingsEyebrow: ["按照你的习惯", "MAKE IT YOURS", "SELON VOS PRÉFÉRENCES"],
  practice: ["练习空间", "Practice", "Espace de pratique"],
  favorites: ["收藏与复习", "Saved & review", "Favoris et révision"],
  settings: ["设置", "Settings", "Réglages"],
  newChat: ["新建对话", "New conversation", "Nouvelle conversation"],
  conversations: ["我的对话", "CONVERSATIONS", "CONVERSATIONS"],
  localSpace: [
    "你的本地学习空间",
    "YOUR PERSONAL LEARNING SPACE",
    "VOTRE ESPACE PERSONNEL",
  ],
  tagline: [
    "让理解，成为表达。",
    "Turn understanding into expression.",
    "De la compréhension à l’expression.",
  ],
  welcomeText: [
    "一句话，一次主动表达。按照自己的节奏，练习、追问，再进步一点。",
    "One sentence. One deliberate attempt. Practice, ask, and improve at your own pace.",
    "Une phrase, un effort d’expression. Pratiquez, posez vos questions et progressez à votre rythme.",
  ],
  start: ["开始练习", "Start practicing", "Commencer"],
  setup: ["准备你的练习空间", "Make this space yours", "Préparez votre espace"],
  source: ["出题语言", "Source language", "Langue source"],
  target: ["目标语言", "Target language", "Langue cible"],
  role: ["练习角色", "Learning context", "Profil"],
  scene: ["场景", "Scenario", "Situation"],
  scenePlaceholder: [
    "随机练习，或输入你想练习的场景",
    "Random, or describe a scenario",
    "Aléatoire, ou décrivez une situation",
  ],
  random: ["随机练习", "Open practice", "Pratique libre"],
  level: ["表达水平", "Expression level", "Niveau d’expression"],
  mode: ["难度模式", "Difficulty mode", "Mode de difficulté"],
  auto: ["自动调整", "Adaptive", "Adaptatif"],
  fixed: ["固定难度", "Fixed", "Fixe"],
  diagnostic: ["简短诊断", "Quick assessment", "Bilan rapide"],
  diagnosticInfo: [
    "默认用 5 道短翻译题估计表达水平，结束前不显示参考答案。",
    "Five short translations estimate your level. Feedback stays hidden until the end.",
    "Cinq traductions pour estimer votre niveau. Les corrections restent masquées jusqu’à la fin.",
  ],
  skip: [
    "跳过，自选水平",
    "Skip, choose my level",
    "Passer, choisir mon niveau",
  ],
  profileExists: [
    "已保存该目标语言的水平。仍可重新诊断；选择跳过时可沿用或调整水平。",
    "You have a saved level. You can take a new assessment, or skip and keep or adjust this level.",
    "Votre niveau est enregistré. Vous pouvez refaire le diagnostic ou le passer et conserver ou ajuster ce niveau.",
  ],
  create: ["创建并开始", "Create & start", "Créer et commencer"],
  cancel: ["取消", "Cancel", "Annuler"],
  close: ["关闭", "Close", "Fermer"],
  save: ["保存", "Save", "Enregistrer"],
  saved: ["已保存到本机", "Saved locally", "Enregistré localement"],
  saving: ["保存中…", "Saving…", "Enregistrement…"],
  unsaved: [
    "未保存 · 点击重试",
    "Not saved · retry",
    "Non enregistré · réessayer",
  ],
  loading: ["处理中…", "Working…", "Traitement…"],
  generating: [
    "正在为你准备下一句话…",
    "Preparing your next sentence…",
    "Préparation de votre prochaine phrase…",
  ],
  emptyChat: [
    "准备好了，开始第一题吧。",
    "Ready for your first sentence.",
    "Tout est prêt pour votre première phrase.",
  ],
  generate: ["生成题目", "Generate a sentence", "Générer une phrase"],
  next: ["下一题", "Next sentence", "Phrase suivante"],
  skipNext: ["跳过，下一题", "Skip to next", "Passer à la suivante"],
  retry: ["重试", "Retry", "Réessayer"],
  translateInto: ["请翻译成", "TRANSLATE INTO", "TRADUISEZ EN"],
  context: ["背景", "Context", "Contexte"],
  knowledge: ["练习重点", "Focus", "Point à travailler"],
  question: ["题目", "Sentence", "Phrase"],
  feedback: ["点评", "Feedback", "Correction"],
  answer: ["你的翻译", "Your translation", "Votre traduction"],
  answerPlaceholder: [
    "试着用自己的话表达，不必追求一次完美。",
    "Find your own words. It doesn’t have to be perfect.",
    "Trouvez vos propres mots. Pas besoin d’être parfait.",
  ],
  submit: ["提交翻译", "Get feedback", "Obtenir une correction"],
  followup: ["追问", "Ask a question", "Poser une question"],
  askPlaceholder: [
    "询问词汇、语法或其他表达方式…",
    "Ask about a word, grammar, or another way to say it…",
    "Une question sur un mot, la grammaire ou une autre formulation…",
  ],
  send: ["发送追问", "Send question", "Envoyer la question"],
  revise: ["修改答案", "Revise answer", "Modifier la traduction"],
  first: ["首次作答", "First attempt", "Premier essai"],
  revision: ["修改后", "Revision", "Version modifiée"],
  review: ["复习作答", "Review attempt", "Essai de révision"],
  attempt: ["作答", "Attempt", "Essai"],
  overall: ["整体判断", "Overall assessment", "Appréciation générale"],
  strength: ["值得保留", "What works", "Points réussis"],
  issues: ["具体修改", "Suggested changes", "Modifications proposées"],
  noIssues: [
    "无需修改，保留你的表达。",
    "No changes needed. Keep your expression.",
    "Aucune modification nécessaire. Gardez votre formulation.",
  ],
  error: ["需要修改", "Correction", "À corriger"],
  polish: ["可选润色", "Optional polish", "Amélioration facultative"],
  references: ["参考表达", "Reference translations", "Traductions possibles"],
  score: ["表达评分", "Expression score", "Score d’expression"],
  meaning: ["语义准确", "Meaning", "Sens"],
  grammar: ["语法", "Grammar", "Grammaire"],
  vocabulary: ["词汇与搭配", "Vocabulary", "Vocabulaire"],
  naturalness: ["自然度与语域", "Naturalness", "Naturel et registre"],
  aiNote: [
    "AI 点评是学习建议，允许多种正确译法。",
    "AI feedback is learning advice. Many translations can be correct.",
    "Les conseils de l’IA admettent plusieurs traductions correctes.",
  ],
  invalidAnswer: [
    "请使用目标语言尝试翻译后再次提交。本次不计入调难。",
    "Try a translation in the target language. This attempt won’t affect difficulty.",
    "Essayez de traduire dans la langue cible. Cet essai ne modifie pas la difficulté.",
  ],
  history: ["题目历史", "Sentence history", "Historique des phrases"],
  backPractice: ["返回当前练习", "Back to practice", "Retour à la pratique"],
  reviewHidden: [
    "复习中 · 旧答案已隐藏，提交后可查看对比。",
    "Review mode · earlier answers are hidden until you submit.",
    "Révision · les anciennes réponses sont masquées jusqu’à votre envoi.",
  ],
  showOriginal: ["查看原记录", "View original", "Voir l’original"],
  reviewNow: ["重新练习", "Practice again", "Réessayer"],
  savedQuestion: ["收藏题目", "Save sentence", "Enregistrer la phrase"],
  savedFeedback: ["收藏点评", "Save feedback", "Enregistrer la correction"],
  unsave: ["取消收藏", "Unsave", "Retirer des favoris"],
  noFavorites: [
    "值得再练的句子，留在这里。",
    "Keep the sentences worth another try.",
    "Gardez ici les phrases à retravailler.",
  ],
  favoritesIntro: [
    "收藏一句好题，或一次有启发的点评。按自己的节奏回来复习。",
    "Save a useful sentence or an insightful correction. Return whenever you’re ready.",
    "Enregistrez une phrase utile ou une correction éclairante. Revenez à votre rythme.",
  ],
  all: ["全部", "All", "Tout"],
  allLanguages: ["全部语言方向", "All language pairs", "Toutes les directions"],
  allChats: ["全部对话", "All conversations", "Toutes les conversations"],
  editChat: ["练习设置", "Practice settings", "Réglages de pratique"],
  title: ["对话名称", "Conversation name", "Nom de la conversation"],
  nextOnly: [
    "这些设置从下一题生效；当前题目仍使用原设置。",
    "Changes apply to the next sentence. The current sentence keeps its original settings.",
    "Les changements s’appliquent à la prochaine phrase. La phrase actuelle conserve ses réglages.",
  ],
  profileRequired: [
    "该目标语言还没有水平档案，请选择初始水平，或保存后重新诊断。",
    "No level profile yet. Choose an initial level, or reassess after saving.",
    "Aucun niveau enregistré. Choisissez un niveau initial ou lancez un bilan après l’enregistrement.",
  ],
  adjustUp: [
    "最近几题表现稳定，后续难度提高一级。",
    "Consistent recent work. Difficulty has increased by one level.",
    "Vos résultats sont réguliers. La difficulté augmente d’un niveau.",
  ],
  adjustDown: [
    "最近几题有些吃力，后续难度降低一级。",
    "Recent sentences were challenging. Difficulty has decreased by one level.",
    "Les dernières phrases étaient difficiles. La difficulté diminue d’un niveau.",
  ],
  completedCount: ["完成作答", "Attempts completed", "Essais terminés"],
  average: [
    "首次平均分",
    "First-attempt average",
    "Moyenne des premiers essais",
  ],
  yourPace: [
    "每天一点，表达更远。",
    "A little practice. A wider world.",
    "Un peu de pratique. Un monde plus grand.",
  ],
  localData: [
    "记录保存在本机",
    "Records stay on this computer",
    "Données sur cet ordinateur",
  ],
  interface: ["界面语言", "Interface language", "Langue de l’interface"],
  system: ["跟随系统", "System default", "Selon le système"],
  defaults: [
    "新对话默认值",
    "New conversation defaults",
    "Valeurs des nouvelles conversations",
  ],
  defaultsInfo: [
    "只影响新对话，已有对话保持自己的设置。",
    "Used for new conversations. Existing conversations keep their settings.",
    "Pour les nouvelles conversations. Les conversations existantes gardent leurs réglages.",
  ],
  profiles: ["语言水平档案", "Language profiles", "Profils linguistiques"],
  noProfile: ["尚未建立", "Not set yet", "Non défini"],
  reassess: ["重新诊断", "Reassess", "Refaire le bilan"],
  assessmentResult: [
    "你的表达起点",
    "Your starting point",
    "Votre point de départ",
  ],
  estimated: [
    "这是练习难度估计，不是官方等级认证。",
    "An estimate for practice, not an official certification.",
    "Une estimation pour pratiquer, sans certification officielle.",
  ],
  updateProfile: [
    "同时更新该目标语言的全局基准",
    "Also update this language’s baseline",
    "Mettre aussi à jour le niveau de référence",
  ],
  applyLevel: [
    "采用水平，进入练习",
    "Use level & practice",
    "Adopter le niveau et pratiquer",
  ],
  continueAssessment: ["继续诊断", "Continue assessment", "Continuer le bilan"],
  skipAssessment: [
    "结束诊断，自选水平",
    "End assessment, choose level",
    "Terminer le bilan et choisir le niveau",
  ],
  assessmentProgress: ["已完成", "Completed", "Terminé"],
  assessmentSaved: [
    "已完成的答案已保存，可随时继续。",
    "Your answers are saved. Continue whenever you like.",
    "Vos réponses sont enregistrées. Reprenez quand vous voulez.",
  ],
  aiService: ["AI 服务", "AI service", "Service IA"],
  localModel: ["本地千问", "Local Qwen", "Qwen local"],
  onlineModel: ["在线模型", "Online model", "Modèle en ligne"],
  localInfo: [
    "通过 Ollama 在本机运行千问。首次下载后，文字练习无需联网；语音识别可能仍需联网。",
    "Qwen runs locally through Ollama. After download, text practice works offline; speech recognition may still need a connection.",
    "Qwen fonctionne localement avec Ollama. Après téléchargement, la pratique écrite fonctionne hors ligne ; la dictée peut nécessiter Internet.",
  ],
  onlineInfo: [
    "仅将当前任务所需内容发送给你配置的在线服务。密钥仅保存在本地服务端。",
    "Only task-relevant content goes to your chosen service. The key stays on the local server.",
    "Seul le contenu utile est envoyé au service choisi. La clé reste sur le serveur local.",
  ],
  baseUrl: ["服务地址", "Base URL", "URL du service"],
  model: ["模型名称", "Model name", "Nom du modèle"],
  apiKey: ["API 密钥", "API key", "Clé API"],
  keySaved: [
    "已保存密钥；留空保留原值",
    "Key saved; leave blank to keep",
    "Clé enregistrée ; vide pour la conserver",
  ],
  testConnection: ["测试连接", "Test connection", "Tester la connexion"],
  connected: ["连接成功", "Connection successful", "Connexion réussie"],
  installLocal: [
    "下载并配置本地千问",
    "Download & set up local Qwen",
    "Télécharger et configurer Qwen",
  ],
  installInfo: [
    "首次下载运行时与约 3 GB 模型，请留出至少 5 GB 磁盘空间。下载进度会显示在这里。",
    "Downloads the runtime and a model of about 3 GB. Allow at least 5 GB of disk space. Progress appears here.",
    "Télécharge le moteur et un modèle d’environ 3 Go. Prévoyez au moins 5 Go d’espace disque.",
  ],
  startLocal: [
    "启动本地模型服务",
    "Start local model service",
    "Démarrer le service local",
  ],
  checkModels: [
    "检测已安装模型",
    "Detect installed models",
    "Détecter les modèles installés",
  ],
  backup: ["数据备份", "Data backup", "Sauvegarde"],
  backupInfo: [
    "完整备份包含学习记录和草稿，不包含模型权重、密钥或原始录音。",
    "Backups include learning records and drafts, excluding model weights, keys, and raw audio.",
    "Les sauvegardes incluent les données et brouillons, sans modèles, clés ni audio brut.",
  ],
  export: ["导出备份", "Export backup", "Exporter"],
  import: ["导入备份", "Import backup", "Importer"],
  importConfirm: [
    "确认替换当前学习数据？操作前会自动备份现有数据。",
    "Replace current learning data? A safety backup will be created first.",
    "Remplacer les données actuelles ? Une sauvegarde préalable sera créée.",
  ],
  importDone: ["备份已恢复", "Backup restored", "Sauvegarde restaurée"],
  importPreview: ["备份内容", "Backup contents", "Contenu de la sauvegarde"],
  dataPath: ["数据位置", "Data location", "Emplacement des données"],
  privacy: [
    "本地单用户运行，无账号，无云同步。请定期导出备份。",
    "Local single-user app. No accounts or cloud sync. Export backups regularly.",
    "Application locale, utilisateur unique. Sans compte ni synchronisation. Exportez régulièrement vos données.",
  ],
  voice: ["语音输入", "Dictate", "Dicter"],
  recording: [
    "录音中 · 最长 60 秒",
    "Listening · up to 60 seconds",
    "Écoute · 60 secondes maximum",
  ],
  transcribing: ["转写中…", "Transcribing…", "Transcription…"],
  voiceDone: [
    "转写已加入草稿，请确认或修改后提交。",
    "Transcription added. Check or edit before submitting.",
    "Transcription ajoutée. Vérifiez ou modifiez avant d’envoyer.",
  ],
  voiceIdle: [
    "只评价文字，不评价发音。",
    "Feedback covers text, not pronunciation.",
    "La correction porte sur le texte, pas la prononciation.",
  ],
  stopVoice: ["停止录音", "Stop dictation", "Arrêter la dictée"],
  cancelVoice: ["取消录音", "Cancel dictation", "Annuler la dictée"],
  undoVoice: ["撤销转写追加", "Undo transcription", "Annuler la transcription"],
  voiceUnsupported: [
    "此浏览器不支持语音识别。请使用支持 SpeechRecognition 的 Chrome 或 Safari，或直接打字。",
    "Speech recognition is unavailable. Use Chrome or Safari with SpeechRecognition support, or type your answer.",
    "Dictée indisponible. Utilisez Chrome ou Safari compatible avec SpeechRecognition, ou saisissez votre réponse.",
  ],
  voiceFailed: [
    "语音识别失败或未获麦克风权限，已有草稿已保留。",
    "Speech recognition failed or microphone permission was denied. Your draft is preserved.",
    "Échec de la dictée ou accès au micro refusé. Votre brouillon est conservé.",
  ],
  emptyInput: ["请先输入内容", "Enter some text first", "Saisissez du texte"],
  retryGrade: [
    "重试本次点评",
    "Retry this feedback",
    "Réessayer cette correction",
  ],
  noChats: [
    "从第一句开始",
    "Start with one sentence",
    "Commencez par une phrase",
  ],
  menu: ["打开导航", "Open navigation", "Ouvrir la navigation"],
  moreIssues: [
    "查看全部修改",
    "See all changes",
    "Voir toutes les modifications",
  ],
  localSetupReady: [
    "本地模型已就绪",
    "Local model is ready",
    "Le modèle local est prêt",
  ],
  runtimeDownload: [
    "正在下载运行时",
    "Downloading runtime",
    "Téléchargement du moteur",
  ],
  modelDownload: [
    "正在下载模型",
    "Downloading model",
    "Téléchargement du modèle",
  ],
  runtimeStarting: [
    "正在启动本地服务",
    "Starting local service",
    "Démarrage du service local",
  ],
  runtimeError: [
    "本地配置失败，可重试或查看终端说明",
    "Local setup failed. Retry or check the terminal instructions",
    "Échec de la configuration locale. Réessayez ou consultez les instructions",
  ],
  configureAI: ["配置 AI 服务", "Configure AI", "Configurer l’IA"],
  emptyModels: [
    "未检测到已安装模型",
    "No installed models found",
    "Aucun modèle installé",
  ],
  examNote: [
    "考试角色表示话题与语域倾向，不提供官方考试评分。",
    "Exam contexts guide topics and register, not official exam scoring.",
    "Les profils d’examen orientent les sujets et le registre, sans note officielle.",
  ],
};
const errors = {
  CORPUS_EMPTY: [
    "本地题库暂无符合当前条件且未练习过的题目。请在练习设置中改选默认／自动选择、AI，或调整等级、角色、场景后重试。",
    "No unseen local question matches these settings. Choose automatic or AI in practice settings, or adjust the level, role or scene and retry.",
    "Aucune question locale inédite ne correspond. Choisissez le mode automatique ou l’IA dans les réglages de pratique, ou modifiez le niveau, le rôle ou le thème et réessayez.",
  ],
  AI_LANGUAGE: [
    "AI 返回的内容语言不符合当前方向，未发布点评。请重试或更换模型。",
    "The AI used the wrong content language. No feedback was published. Retry or switch models.",
    "L’IA n’a pas respecté les langues choisies. Aucune correction publiée. Réessayez ou changez de modèle.",
  ],
  AI_NOT_CONFIGURED: [
    "请先在设置中配置 AI 服务。",
    "Configure an AI service in Settings first.",
    "Configurez un service IA dans les réglages.",
  ],
  AI_AUTH: [
    "认证失败，请检查服务端密钥。",
    "Authentication failed. Check your API key.",
    "Échec d’authentification. Vérifiez votre clé.",
  ],
  AI_QUOTA: [
    "服务额度不足，请检查供应商账户。",
    "Insufficient quota. Check your provider account.",
    "Quota insuffisant. Vérifiez votre compte fournisseur.",
  ],
  AI_RATE_LIMIT: [
    "服务限流，请稍后手动重试，也可能需要检查额度。",
    "Rate limited. Retry later and check your quota.",
    "Limite atteinte. Réessayez plus tard et vérifiez votre quota.",
  ],
  AI_NETWORK: [
    "无法连接 AI 服务。本地模式请先下载或启动千问；在线模式请检查网络与地址。",
    "Cannot reach the AI service. Start local Qwen or check your network and URL.",
    "Service IA inaccessible. Démarrez Qwen local ou vérifiez le réseau et l’URL.",
  ],
  MODEL_MISSING: [
    "本地模型尚未下载，请在设置中完成配置。",
    "Local model missing. Download it in Settings.",
    "Modèle local absent. Téléchargez-le dans les réglages.",
  ],
  AI_TIMEOUT: [
    "请求超时，答案已保留。远端可能已处理，可手动重试。",
    "Request timed out. Your answer is saved. The provider may have processed it; retry manually.",
    "Délai dépassé. Votre réponse est conservée. Le fournisseur a pu la traiter ; réessayez manuellement.",
  ],
  AI_FORMAT: [
    "点评结构或评分不一致，未发布结果。请重试。",
    "The AI response is incomplete or inconsistent. No score was published. Retry.",
    "Réponse IA incomplète ou incohérente. Aucun score publié. Réessayez.",
  ],
  AI_DUPLICATE: [
    "生成了重复题目，请重试。",
    "A repeated sentence was generated. Retry.",
    "Une phrase répétée a été générée. Réessayez.",
  ],
  INTERRUPTED: [
    "服务曾中断，内容已保存，请重试。",
    "Service interrupted. Your content is saved. Retry.",
    "Service interrompu. Contenu enregistré. Réessayez.",
  ],
  SAVE_FAILED: [
    "保存失败，内容尚未安全保存。请重试或导出可见内容。",
    "Save failed. Your content isn’t safely stored. Retry or copy your visible work.",
    "Échec de l’enregistrement. Réessayez ou copiez le contenu visible.",
  ],
  BACKUP_VERSION: [
    "备份版本不兼容，原数据未更改。",
    "Incompatible backup version. Existing data is unchanged.",
    "Version de sauvegarde incompatible. Données inchangées.",
  ],
  BACKUP_INVALID: [
    "备份损坏或关联不完整，原数据未更改。",
    "Damaged backup or broken references. Existing data is unchanged.",
    "Sauvegarde endommagée ou références invalides. Données inchangées.",
  ],
  BUSY: [
    "该操作正在处理，请稍候。",
    "This operation is in progress. Please wait.",
    "Opération en cours. Veuillez patienter.",
  ],
  PROFILE_REQUIRED: [
    "请为新目标语言选择初始水平。",
    "Choose an initial level for this target language.",
    "Choisissez un niveau initial pour cette langue cible.",
  ],
  INVALID_DIRECTION: [
    "出题语言与目标语言必须不同。",
    "Source and target languages must differ.",
    "Les langues source et cible doivent être différentes.",
  ],
  LOCAL_ONLY: [
    "本地模式只允许本机地址。",
    "Local mode requires a loopback URL.",
    "Le mode local exige une adresse locale.",
  ],
  ANSWER_INVALID: [
    "请用目标语言重新作答。",
    "Try again in the target language.",
    "Réessayez dans la langue cible.",
  ],
  ANSWER_REQUIRED: [
    "请先完成当前作答。",
    "Complete the current answer first.",
    "Terminez d’abord la réponse actuelle.",
  ],
  UNAVAILABLE: [
    "此环境不支持自动安装，请按 README 手动安装 Ollama。",
    "Automatic setup is unavailable. Follow README to install Ollama.",
    "Installation automatique indisponible. Suivez le README pour installer Ollama.",
  ],
};
export const roleLabels = {
  primary: ["小学生", "Primary school", "École primaire"],
  middle: ["初中生", "Middle school", "Collège"],
  high: ["高中生", "High school", "Lycée"],
  ielts: ["雅思备考", "IELTS topics", "Thèmes IELTS"],
  gre: ["GRE 备考", "GRE topics", "Thèmes GRE"],
  abroad: ["海外生活", "Living abroad", "Vie à l’étranger"],
  daily: ["日常交流", "Everyday life", "Vie quotidienne"],
  work: ["工作交流", "Work & career", "Vie professionnelle"],
  independent: ["自主学习", "Independent study", "Étude autonome"],
};
export const levelLabels = [
  null,
  ["基础短句", "Basic short sentences", "Phrases courtes de base"],
  [
    "日常简单表达",
    "Simple everyday expression",
    "Expressions simples du quotidien",
  ],
  [
    "多分句与常见抽象表达",
    "Connected ideas & familiar abstractions",
    "Idées liées et notions abstraites courantes",
  ],
  [
    "较复杂观点与语域切换",
    "Complex views & register shifts",
    "Opinions complexes et registres",
  ],
  [
    "精细语义与复杂表达",
    "Nuanced meaning & complex expression",
    "Nuances et expression complexe",
  ],
];
export const scenes = {
  daily: ["日常生活", "Everyday life", "Vie quotidienne"],
  food: ["餐饮购物", "Food & shopping", "Repas et achats"],
  travel: ["旅行出行", "Travel", "Voyages"],
  school: ["学习校园", "Study & campus", "Études"],
  work: ["工作沟通", "Work communication", "Communication professionnelle"],
  abroad: ["海外生活", "Living abroad", "Vie à l’étranger"],
  ideas: ["观点表达", "Expressing opinions", "Exprimer des opinions"],
};
export let language = "zh";
export function setLanguage(mode) {
  const system = navigator.language.toLowerCase();
  language =
    mode === "system"
      ? system.startsWith("zh")
        ? "zh"
        : system.startsWith("fr")
          ? "fr"
          : "en"
      : mode;
  document.documentElement.lang = language;
}
export function pick(values) {
  return values?.[["zh", "en", "fr"].indexOf(language)] ?? "";
}
export const t = (key) => pick(catalog[key]) || key;
export const errorMessage = (code) =>
  pick(errors[code]) ||
  pick([
    "操作失败，请检查输入或服务配置后重试。",
    "Operation failed. Check your input or service configuration and retry.",
    "Échec de l’opération. Vérifiez la saisie ou la configuration et réessayez.",
  ]);
export const langName = (l) =>
  ({ zh: "中文", en: "English", fr: "Français" })[l] || l;
export const roleName = (r) => pick(roleLabels[r]);
export const levelName = (l) => pick(levelLabels[l]);

export type Language = 'pt-BR' | 'es';

export interface Dictionary {
  common: {
    appName: string;
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    edit: string;
    delete: string;
    create: string;
    search: string;
    filter: string;
    export: string;
    back: string;
    next: string;
    submit: string;
    confirm: string;
    close: string;
    yes: string;
    no: string;
    active: string;
    inactive: string;
    paused: string;
    confirmed: string;
    canceled: string;
    status: string;
    actions: string;
    noResults: string;
    copyLink: string;
    copiedToClipboard: string;
  };

  header: {
    languageSelector: string;
    navInscription: string;
    navCheckStatus: string;
    navWorkshops: string;
  };

  publicWorkshops: {
    title: string;
    subtitle: string;
    seeDetails: string;
    backToWorkshops: string;
    noWorkshops: string;
    errorLoading: string;
    typeWorkshop: string;
    typePlenaria: string;
    session: string;
    sessions: string;
    sessionsSubtitle: string;
    room: string;
    vagasDisponiveis: string;
    capacity: string;
    speakers: string;
    description: string;
    speakerBiography: string;
  };

  publicInscription: {
    title: string;
    subtitle: string;
    enterVoucher: string;
    voucherPlaceholder: string;
    validateVoucher: string;
    institution: string;
    voucherCodeLabel: string;
    voucherQuotaRemaining: string;
    institutionQuotaRemaining: string;
    availableInOneVoucher: string;
    availableInVouchersCount: string;
    formTitle: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    country: string;
    countryPlaceholder: string;
    gender: string;
    genderPlaceholder: string;
    shirtSize: string;
    shirtSizePlaceholder: string;
    campo: string;
    campoPlaceholder: string;
    plataforma: string;
    plataformaPlaceholder: string;
    seguidores: string;
    seguidoresPlaceholder: string;
    documento: string;
    documentoPlaceholder: string;
    conteudo: string;
    conteudoPlaceholder: string;
    linkOrHandle: string;
    linkOrHandlePlaceholder: string;
    wantsToKnowNovoTempo: string;
    tourNt: string;
    flightDepartureTime: string;
    flightReturnTime: string;
    role: string;
    rolePlaceholder: string;
    roleOptions: Record<string, string>;
    submitInscription: string;
    successTitle: string;
    successMessage: string;
    registrationCode: string;
    registrationDetails: string;
    checkEmailConfirmation: string;
  };

  checkStatus: {
    title: string;
    subtitle: string;
    codeLabel: string;
    codePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    checkButton: string;
    statusConfirmed: string;
    statusCanceled: string;
    notFound: string;
    fullName: string;
    institution: string;
    institutionGroup: string;
    group1: string;
    group2: string;
    group3: string;
    groupColorRed: string;
    groupColorGreen: string;
    groupColorBlue: string;
    registeredAt: string;
    workshopsTitle: string;
    workshopsSubtitle: string;
    workshopSelectPlaceholder: string;
    sessionLabel: string;
    workshopOptionVagas: string;
    saveWorkshops: string;
    workshopsSaved: string;
    workshopFull: string;
    workshopNotFound: string;
    myQRForCheckin: string;
    myQRHint: string;
  };

  landing: {
    heroTitle: string;
    heroSubtitle: string;
    heroCta: string;
    speakersTitle: string;
    speakersSubtitle: string;
    programTitle: string;
    programSubtitle: string;
    day16: string;
    day17: string;
    day18: string;
    inscriptionTitle: string;
    inscriptionSubtitle: string;
    inscriptionCta: string;
    footerWorkshops: string;
    footerInscription: string;
    footerCheckStatus: string;
    noSpeakers: string;
    noProgram: string;
    errorLoading: string;
  };

  errors: {
    requiredField: string;
    invalidEmail: string;
    invalidPhone: string;
    voucherNotFound: string;
    voucherInactive: string;
    voucherExpired: string;
    voucherNoQuota: string;
    institutionNoQuota: string;
    emailAlreadyRegistered: string;
    registrationFailed: string;
    genericError: string;
    unauthorized: string;
    notFound: string;
    rateLimitExceeded: string;
  };

  admin: {
    login: {
      title: string;
      email: string;
      password: string;
      signIn: string;
      invalidCredentials: string;
    };

    nav: {
      dashboard: string;
      institutions: string;
      rooms: string;
      speakers: string;
      workshops: string;
      workshopsAndPlenarias: string;
      vouchers: string;
      registrations: string;
      checkin: string;
      users: string;
      settings: string;
      logout: string;
    };

    users: {
      title: string;
      createUser: string;
      createUserDescription: string;
      listTitle: string;
      listDescription: string;
      email: string;
      emailPlaceholder: string;
      password: string;
      passwordPlaceholder: string;
      role: string;
      roleAdmin: string;
      roleCheckin: string;
      status: string;
      createdAt: string;
      noUsers: string;
      addUser: string;
      backToList: string;
      submit: string;
      success: string;
      emailAlreadyExists: string;
      passwordTooShort: string;
      passwordTooWeak: string;
      errorGeneric: string;
    };

    checkin: {
      title: string;
      subtitle: string;
      scanQR: string;
      scanQRHint: string;
      manualCode: string;
      codePlaceholder: string;
      lookup: string;
      confirmFor: string;
      confirmCheckin: string;
      confirmCheckinCountdown: string;
      alreadyCheckedIn: string;
      success: string;
      /** Texto com placeholder {datetime} (data/hora já formatada). */
      checkinRecordedAt: string;
      scanAnother: string;
      scanAnotherHint: string;
      /** Botão para pedir câmera de novo (gesto do usuário; ajuda em Android). */
      forceCamera: string;
      notFound: string;
      canceled: string;
      errorGeneric: string;
    };

    settings: {
      title: string;
      changePassword: string;
      changePasswordDescription: string;
      changePasswordRequiredDescription: string;
      mustChangePasswordRequired: string;
      passwordRules: string;
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
      submit: string;
      success: string;
      wrongPassword: string;
      weakPassword: string;
      mismatch: string;
      passwordSyncFailed: string;
    };

    dashboard: {
      title: string;
      totalRegistrations: string;
      activeInstitutions: string;
      activeVouchers: string;
      alerts: string;
      lowQuotaVouchers: string;
      institutionUsage: string;
      institutionName: string;
      used: string;
      total: string;
      remaining: string;
      noAlerts: string;
      workshopsBySection: string;
      sessionLabel: string;
      filledSlots: string;
    };

    institutions: {
      title: string;
      createNew: string;
      name: string;
      country: string;
      countryPlaceholder: string;
      group: string;
      group1: string;
      group2: string;
      group3: string;
      filterNamePlaceholder: string;
      filterCountryAll: string;
      filterGroupAll: string;
      quotaTotal: string;
      usedCount: string;
      remaining: string;
      status: string;
      createdAt: string;
      editInstitution: string;
      createInstitution: string;
      deleteConfirm: string;
      deleteWarning: string;
      saved: string;
      deleted: string;
      total: string;
    };

    rooms: {
      title: string;
      createNew: string;
      name: string;
      capacity: string;
      status: string;
      editRoom: string;
      createRoom: string;
      deleteConfirm: string;
      deleteWarning: string;
      saved: string;
      deleted: string;
    };

    speakers: {
      title: string;
      createNew: string;
      name: string;
      namePlaceholder: string;
      biography: string;
      biographyPlaceholder: string;
      photo: string;
      uploadPhoto: string;
      photoUrlPlaceholder: string;
      editSpeaker: string;
      createSpeaker: string;
      deleteConfirm: string;
      deleteWarning: string;
      saved: string;
      deleted: string;
      photoUploaded: string;
      uploadNotConfigured: string;
      bucketNotFound: string;
      fileTooLarge: string;
    };

    workshops: {
      title: string;
      createNew: string;
      titleLabel: string;
      titlePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      room: string;
      roomPlaceholder: string;
      noRoom: string;
      speaker: string;
      speakers: string;
      speakerPlaceholder: string;
      noSpeaker: string;
      noSpeakersAvailable: string;
      editWorkshop: string;
      createWorkshop: string;
      deleteConfirm: string;
      deleteWarning: string;
      saved: string;
      deleted: string;
    };

    workshopsAndPlenarias: {
      title: string;
      createNew: string;
      filterLabel: string;
      filterAll: string;
      filterEmpty: string;
      typeLabel: string;
      typeWorkshop: string;
      typePlenaria: string;
      titleLabel: string;
      titlePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      room: string;
      roomPlaceholder: string;
      noRoom: string;
      speaker: string;
      speakers: string;
      noSpeakersAvailable: string;
      editWorkshop: string;
      createWorkshop: string;
      deleteConfirm: string;
      deleteWarning: string;
      saved: string;
      deleted: string;
      translationEs: string;
    };

    vouchers: {
      title: string;
      createNew: string;
      code: string;
      institution: string;
      filterInstitutionPlaceholder: string;
      quotaTotal: string;
      usedCount: string;
      remaining: string;
      status: string;
      expiresAt: string;
      createdAt: string;
      editVoucher: string;
      createVoucher: string;
      deleteConfirm: string;
      deleteWarning: string;
      saved: string;
      deleted: string;
      generateCode: string;
      codeGenerated: string;
      copyInscriptionLink: string;
      linkCopied: string;
      noExpiration: string;
      setExpiration: string;
    };

    registrations: {
      title: string;
      registrationCode: string;
      fullName: string;
      email: string;
      phone: string;
      gender: string;
      shirtSize: string;
      campo: string;
      plataforma: string;
      seguidores: string;
      documento: string;
      conteudo: string;
      linkOrHandle: string;
      tourNt: string;
      flightDepartureTime: string;
      flightReturnTime: string;
      visitation: string;
      checkinFilter: string;
      checkinDateTimeColumn: string;
      role: string;
      institution: string;
      voucher: string;
      language: string;
      status: string;
      createdAt: string;
      cancelRegistration: string;
      resendEmail: string;
      resendWhatsApp: string;
      whatsAppSent: string;
      cancelConfirm: string;
      cancelWarning: string;
      canceled: string;
      emailResent: string;
      emailAlreadySent: string;
      exportCSV: string;
      exportXLSX: string;
      includeCanceled: string;
      onlyConfirmed: string;
      deleteRegistration: string;
      deleteConfirm: string;
      deleteWarning: string;
      deleted: string;
      reactivateRegistration: string;
      reactivated: string;
      editRegistration: string;
      editRegistrationTitle: string;
      saved: string;
      perPage: string;
      showingOf: string;
      previous: string;
      nextPage: string;
    };
  };

  email: {
    confirmation: {
      subject: string;
      greeting: string;
      body: string;
      detailsTitle: string;
      name: string;
      email: string;
      phone: string;
      gender: string;
      shirtSize: string;
      role: string;
      institution: string;
      registrationCode: string;
      footer: string;
    };
  };
}

export const dictionaries: Record<Language, Dictionary> = {
  'pt-BR': {
    common: {
      appName: 'Creators Summit 2026',
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      cancel: 'Cancelar',
      save: 'Salvar',
      edit: 'Editar',
      delete: 'Excluir',
      create: 'Criar',
      search: 'Buscar',
      filter: 'Filtrar',
      export: 'Exportar',
      back: 'Voltar',
      next: 'Próximo',
      submit: 'Enviar',
      confirm: 'Confirmar',
      close: 'Fechar',
      yes: 'Sim',
      no: 'Não',
      active: 'Ativo',
      inactive: 'Inativo',
      paused: 'Pausado',
      confirmed: 'Confirmado',
      canceled: 'Cancelado',
      status: 'Status',
      actions: 'Ações',
      noResults: 'Nenhum resultado encontrado',
      copyLink: 'Copiar Link',
      copiedToClipboard: 'Copiado para área de transferência',
    },

    header: {
      languageSelector: 'Idioma',
      navInscription: 'Inscreva-se',
      navCheckStatus: 'Consultar inscrição',
      navWorkshops: 'Workshops / Plenárias',
    },

    publicWorkshops: {
      title: 'Workshops e Plenárias',
      subtitle: 'Conheça as palestras e oficinas do evento',
      seeDetails: 'Ver detalhes',
      backToWorkshops: 'Voltar aos workshops',
      noWorkshops: 'Nenhum workshop ou plenária disponível no momento.',
      errorLoading: 'Erro ao carregar. Tente novamente.',
      typeWorkshop: 'Workshop',
      typePlenaria: 'Plenária',
      session: 'Sessão',
      sessions: 'sessões',
      sessionsSubtitle: 'Horários e salas',
      room: 'Sala',
      vagasDisponiveis: 'Vagas disponíveis',
      capacity: 'Capacidade',
      speakers: 'Palestrantes',
      description: 'Descrição',
      speakerBiography: 'Biografia',
    },

    publicInscription: {
      title: 'Inscrição Creators Summit 2026',
      subtitle: 'Preencha o formulário para confirmar sua participação',
      enterVoucher: 'Digite seu código de voucher',
      voucherPlaceholder: 'Ex: A1B2C',
      validateVoucher: 'Validar Voucher',
      institution: 'União/Instituição',
      voucherCodeLabel: 'Código do voucher',
      voucherQuotaRemaining: 'Vagas restantes no voucher',
      institutionQuotaRemaining: 'Vagas restantes na instituição',
      availableInOneVoucher: 'Visível apenas para admins',
      availableInVouchersCount: 'Visível apenas para admins',
      formTitle: 'Dados do Participante',
      fullName: 'Nome Completo',
      fullNamePlaceholder: 'Digite seu nome completo',
      email: 'E-mail',
      emailPlaceholder: 'seu@email.com',
      phone: 'Telefone',
      phonePlaceholder: '(11) 99999-9999',
      country: 'País',
      countryPlaceholder: 'Selecione o país',
      gender: 'Gênero',
      genderPlaceholder: 'Selecione',
      shirtSize: 'Tamanho da Camiseta',
      shirtSizePlaceholder: 'Selecione',
      campo: 'Campo',
      campoPlaceholder: 'Digite o campo',
      plataforma: 'Plataforma',
      plataformaPlaceholder: 'Ex: Instagram, YouTube, TikTok',
      seguidores: 'Seguidores',
      seguidoresPlaceholder: 'Ex: 10000',
      documento: 'Documento',
      documentoPlaceholder: 'CPF, DNI ou passaporte',
      conteudo: 'Conteúdo',
      conteudoPlaceholder: 'Tipo ou descrição do conteúdo',
      linkOrHandle: 'Link ou @',
      linkOrHandlePlaceholder: 'Ex: @seuperfil ou https://...',
      wantsToKnowNovoTempo: 'Desejo conhecer a estrutura da Novo Tempo.',
      tourNt: 'Tour NT',
      flightDepartureTime: 'Horário voo ida',
      flightReturnTime: 'Horário voo volta',
      role: 'Função',
      rolePlaceholder: 'Ex: Administração, Coordenador, Departamental, Designer, Editor(a), Gerente, Produtor(a), Secretária',
      roleOptions: {
        'Administração': 'Administração',
        'Coordenador': 'Coordenador',
        'Departamental': 'Departamental',
        'Designer': 'Designer',
        'Editor(a)': 'Editor(a)',
        'Gerente': 'Gerente',
        'Produtor(a)': 'Produtor(a)',
        'Secretária': 'Secretária',
      },
      submitInscription: 'Confirmar Inscrição',
      successTitle: 'Inscrição confirmada.',
      successMessage: 'Sua inscrição foi realizada com sucesso.',
      registrationCode: 'Código de Registro',
      registrationDetails: 'Detalhes da Inscrição',
      checkEmailConfirmation: 'Verifique seu e-mail para confirmar os dados da inscrição.',
    },

    checkStatus: {
      title: 'Consultar Inscrição',
      subtitle: 'Informe o código da inscrição e o e-mail para verificar o status.',
      codeLabel: 'Código da inscrição',
      codePlaceholder: 'Ex: ABC12XY',
      emailLabel: 'E-mail',
      emailPlaceholder: 'seu@email.com',
      checkButton: 'Verificar status',
      statusConfirmed: 'Inscrição confirmada.',
      statusCanceled: 'Cancelada',
      notFound: 'Inscrição não encontrada. Verifique o código e o e-mail.',
      fullName: 'Nome',
      institution: 'Instituição',
      institutionGroup: 'Grupo',
      group1: 'Grupo 1',
      group2: 'Grupo 2',
      group3: 'Grupo 3',
      groupColorRed: 'Vermelho',
      groupColorGreen: 'Verde',
      groupColorBlue: 'Azul',
      registeredAt: 'Data da inscrição',
      workshopsTitle: 'Inscrição em workshops',
      workshopsSubtitle: 'Escolha até 3 workshops. Não é possível se inscrever no mesmo workshop mais de uma vez.',
      workshopSelectPlaceholder: 'Selecione um workshop',
      sessionLabel: 'Sessão',
      workshopOptionVagas: 'Vagas',
      saveWorkshops: 'Salvar workshops',
      workshopsSaved: 'Workshops atualizados com sucesso.',
      workshopFull: 'Este workshop não possui vagas disponíveis.',
      workshopNotFound: 'Workshop não encontrado.',
      myQRForCheckin: 'Meu QR Code para check-in',
      myQRHint: 'Mostre este QR Code para o organizador no dia do evento.',
    },

    landing: {
      heroTitle: 'Creators Summit 2026',
      heroSubtitle: 'Evento de comunicação e tecnologia. De 16 a 18 de abril.',
      heroCta: 'Fazer inscrição',
      speakersTitle: 'Palestrantes',
      speakersSubtitle: 'Conheça quem vai compartilhar conhecimento no evento.',
      programTitle: 'Programa',
      programSubtitle: 'Workshops e plenárias por dia.',
      day16: 'Quinta 16/04',
      day17: 'Sexta 17/04',
      day18: 'Sábado 18/04',
      inscriptionTitle: 'Garanta sua vaga',
      inscriptionSubtitle: 'Preencha o formulário e confirme sua participação no evento.',
      inscriptionCta: 'Ir para inscrição',
      footerWorkshops: 'Workshops',
      footerInscription: 'Inscrição',
      footerCheckStatus: 'Consultar Inscrição',
      noSpeakers: 'Nenhum palestrante cadastrado no momento.',
      noProgram: 'Nenhuma atividade cadastrada para este dia.',
      errorLoading: 'Erro ao carregar. Tente novamente.',
    },

    errors: {
      requiredField: 'Este campo é obrigatório',
      invalidEmail: 'E-mail inválido',
      invalidPhone: 'Telefone inválido',
      voucherNotFound: 'Voucher inválido ou indisponível',
      voucherInactive: 'Este voucher está inativo',
      voucherExpired: 'Este voucher está expirado',
      voucherNoQuota: 'Vagas esgotadas para este voucher',
      institutionNoQuota: 'Vagas esgotadas para esta instituição',
      emailAlreadyRegistered: 'Este e-mail já está inscrito',
      registrationFailed: 'Falha ao processar inscrição. Tente novamente.',
      genericError: 'Ocorreu um erro. Tente novamente.',
      unauthorized: 'Acesso não autorizado',
      notFound: 'Não encontrado',
      rateLimitExceeded: 'Muitas tentativas. Aguarde um momento.',
    },

    admin: {
      login: {
        title: 'Acesso Administrativo',
        email: 'E-mail',
        password: 'Senha',
        signIn: 'Entrar',
        invalidCredentials: 'E-mail ou senha inválidos',
      },

      nav: {
        dashboard: 'Dashboard',
        institutions: 'Instituições',
        rooms: 'Ambientes',
        speakers: 'Palestrantes',
        workshops: 'Workshops',
        workshopsAndPlenarias: 'Workshops e Plenárias',
        vouchers: 'Vouchers',
        registrations: 'Inscrições',
        checkin: 'Check-in',
        users: 'Usuários',
        settings: 'Configurações',
        logout: 'Sair',
      },

      users: {
        title: 'Usuários',
        createUser: 'Criar usuário',
        createUserDescription: 'O usuário poderá acessar o painel conforme o perfil escolhido. E-mail e senha são usados no login em /admin/login.',
        listTitle: 'Usuários da plataforma',
        listDescription: 'Usuários com acesso ao painel (administradores e equipe de check-in).',
        email: 'E-mail',
        emailPlaceholder: 'exemplo@email.com',
        password: 'Senha',
        passwordPlaceholder: 'Mínimo 8 caracteres',
        role: 'Perfil',
        roleAdmin: 'Administrador',
        roleCheckin: 'Check-in (apenas registro no evento)',
        status: 'Status',
        createdAt: 'Criado em',
        noUsers: 'Nenhum usuário cadastrado.',
        addUser: 'Adicionar usuário',
        backToList: 'Voltar à lista',
        submit: 'Criar usuário',
        success: 'Usuário criado com sucesso.',
        emailAlreadyExists: 'Este e-mail já está em uso.',
        passwordTooShort: 'A senha deve ter no mínimo 8 caracteres.',
        passwordTooWeak: 'Senha muito fraca.',
        errorGeneric: 'Erro ao criar usuário. Tente novamente.',
      },

      checkin: {
        title: 'Check-in no evento',
        subtitle: 'Escaneie o QR do participante ou digite o código para confirmar a presença.',
        scanQR: 'Escanear QR',
        scanQRHint: 'Aponte a câmera para o QR do participante (código da inscrição).',
        manualCode: 'Ou digite o código',
        codePlaceholder: 'Ex: MT-000123',
        lookup: 'Buscar',
        confirmFor: 'Confirmar check-in de {name}?',
        confirmCheckin: 'Confirmar check-in',
        confirmCheckinCountdown: 'Confirmar check-in ({n}s)',
        alreadyCheckedIn: 'Já fez check-in',
        success: 'Check-in confirmado para {name}.',
        checkinRecordedAt: 'Registrado em {datetime} (horário de Brasília).',
        scanAnother: 'Escanear outro',
        scanAnotherHint: 'Clique em "Escanear outro" para usar a câmera.',
        forceCamera: 'Forçar câmera',
        notFound: 'Inscrição não encontrada.',
        canceled: 'Inscrição cancelada.',
        errorGeneric: 'Erro ao processar. Tente novamente.',
      },

      settings: {
        title: 'Configurações',
        changePassword: 'Alterar senha',
        changePasswordDescription: 'Digite sua senha atual e a nova senha. A nova senha deve ter no mínimo 8 caracteres e incluir maiúsculas, minúsculas, números e caracteres especiais.',
        changePasswordRequiredDescription: 'Por segurança, você precisa alterar sua senha antes de continuar.',
        mustChangePasswordRequired: 'Você precisa alterar sua senha para continuar.',
        passwordRules: 'Mínimo 8 caracteres, com maiúsculas, minúsculas, números e caracteres especiais.',
        currentPassword: 'Senha atual',
        newPassword: 'Nova senha',
        confirmPassword: 'Confirmar nova senha',
        submit: 'Alterar senha',
        success: 'Senha alterada com sucesso.',
        wrongPassword: 'Senha atual incorreta.',
        weakPassword: 'A senha deve ter no mínimo 8 caracteres e incluir maiúsculas, minúsculas, números e caracteres especiais.',
        mismatch: 'A confirmação não confere com a nova senha.',
        passwordSyncFailed:
          'A senha foi atualizada, mas o sistema não registrou a conclusão. Tente novamente ou peça suporte.',
      },

      dashboard: {
        title: 'Dashboard',
        totalRegistrations: 'Total de Inscrições',
        activeInstitutions: 'Instituições Ativas',
        activeVouchers: 'Vouchers Ativos',
        alerts: 'Alertas',
        lowQuotaVouchers: 'Vouchers com Poucas Vagas',
        institutionUsage: 'Inscritos por União/Instituição',
        institutionName: 'Instituição',
        used: 'Usadas',
        total: 'Total',
        remaining: 'Restantes',
        noAlerts: 'Nenhum alerta no momento',
        workshopsBySection: 'Workshops',
        sessionLabel: 'Seção',
        filledSlots: 'Vagas preenchidas / disponíveis',
      },

      institutions: {
        title: 'Instituições',
        createNew: 'Nova Instituição',
        name: 'Nome',
        country: 'País',
        countryPlaceholder: 'Selecione o país',
        group: 'Grupo',
        group1: 'Grupo 1',
        group2: 'Grupo 2',
        group3: 'Grupo 3',
        filterNamePlaceholder: 'Filtrar por nome',
        filterCountryAll: 'Todos os países',
        filterGroupAll: 'Todos os grupos',
        quotaTotal: 'Cota Total',
        usedCount: 'Vagas Usadas',
        remaining: 'Restantes',
        status: 'Status',
        createdAt: 'Criado em',
        editInstitution: 'Editar Instituição',
        createInstitution: 'Criar Instituição',
        deleteConfirm: 'Excluir Instituição',
        deleteWarning: 'Tem certeza que deseja excluir esta instituição?',
        saved: 'Instituição salva com sucesso',
        deleted: 'Instituição excluída com sucesso',
        total: 'Total',
      },

      rooms: {
        title: 'Ambientes',
        createNew: 'Novo Ambiente',
        name: 'Nome',
        capacity: 'Capacidade',
        status: 'Status',
        editRoom: 'Editar Ambiente',
        createRoom: 'Criar Ambiente',
        deleteConfirm: 'Excluir Ambiente',
        deleteWarning: 'Tem certeza que deseja excluir este ambiente?',
        saved: 'Ambiente salvo com sucesso',
        deleted: 'Ambiente excluído com sucesso',
      },

      speakers: {
        title: 'Palestrantes',
        createNew: 'Novo Palestrante',
        name: 'Nome',
        namePlaceholder: 'Nome do palestrante',
        biography: 'Biografia',
        biographyPlaceholder: 'Breve biografia ou currículo',
        photo: 'Foto',
        uploadPhoto: 'Enviar foto',
        photoUrlPlaceholder: 'URL da foto (ou use o botão para enviar)',
        editSpeaker: 'Editar Palestrante',
        createSpeaker: 'Cadastrar Palestrante',
        deleteConfirm: 'Excluir Palestrante',
        deleteWarning: 'Tem certeza que deseja excluir este palestrante?',
        saved: 'Palestrante salvo com sucesso',
        deleted: 'Palestrante excluído com sucesso',
        photoUploaded: 'Foto enviada com sucesso',
        uploadNotConfigured:
          'Upload de fotos não configurado. Defina BLOB_READ_WRITE_TOKEN no projeto Vercel (Storage > Blob) ou use o campo URL da foto.',
        bucketNotFound:
          'Blob da Vercel não disponível. Configure o Blob no projeto Vercel (Storage) ou use o campo URL da foto.',
        fileTooLarge: 'Arquivo muito grande. Máximo 5 MB.',
      },

      workshops: {
        title: 'Workshops',
        createNew: 'Novo Workshop',
        titleLabel: 'Título',
        titlePlaceholder: 'Título do workshop',
        description: 'Descrição',
        descriptionPlaceholder: 'Descrição do workshop',
        room: 'Ambiente',
        roomPlaceholder: 'Selecione o ambiente',
        noRoom: 'Nenhum',
        speaker: 'Palestrante',
        speakers: 'Palestrantes',
        speakerPlaceholder: 'Selecione o palestrante',
        noSpeaker: 'Nenhum',
        noSpeakersAvailable: 'Nenhum palestrante cadastrado',
        editWorkshop: 'Editar Workshop',
        createWorkshop: 'Criar Workshop',
        deleteConfirm: 'Excluir Workshop',
        deleteWarning: 'Tem certeza que deseja excluir este workshop?',
        saved: 'Workshop salvo com sucesso',
        deleted: 'Workshop excluído com sucesso',
      },

      workshopsAndPlenarias: {
        title: 'Workshops e Plenárias',
        createNew: 'Novo',
        filterLabel: 'Filtrar',
        filterAll: 'Todos',
        filterEmpty: 'Nenhum item encontrado para este filtro.',
        typeLabel: 'Tipo',
        typeWorkshop: 'Workshop',
        typePlenaria: 'Plenária',
        titleLabel: 'Título',
        titlePlaceholder: 'Título do workshop ou plenária',
        description: 'Descrição',
        descriptionPlaceholder: 'Descrição',
        room: 'Ambiente',
        roomPlaceholder: 'Selecione o ambiente',
        noRoom: 'Nenhum',
        speaker: 'Palestrante',
        speakers: 'Palestrantes',
        noSpeakersAvailable: 'Nenhum palestrante cadastrado',
        editWorkshop: 'Editar',
        createWorkshop: 'Criar',
        deleteConfirm: 'Excluir',
        deleteWarning: 'Tem certeza que deseja excluir este item?',
        saved: 'Salvo com sucesso',
        deleted: 'Excluído com sucesso',
        translationEs: 'Tradução (Español)',
      },

      vouchers: {
        title: 'Vouchers',
        createNew: 'Novo Voucher',
        code: 'Código',
        institution: 'Instituição',
        filterInstitutionPlaceholder: 'Filtrar por nome da instituição',
        quotaTotal: 'Cota Total',
        usedCount: 'Vagas Usadas',
        remaining: 'Restantes',
        status: 'Status',
        expiresAt: 'Expira em',
        createdAt: 'Criado em',
        editVoucher: 'Editar Voucher',
        createVoucher: 'Criar Voucher',
        deleteConfirm: 'Excluir Voucher',
        deleteWarning: 'Tem certeza que deseja excluir este voucher?',
        saved: 'Voucher salvo com sucesso',
        deleted: 'Voucher excluído com sucesso',
        generateCode: 'Gerar Código',
        codeGenerated: 'Código gerado',
        copyInscriptionLink: 'Copiar Link de Inscrição',
        linkCopied: 'Link copiado',
        noExpiration: 'Sem expiração',
        setExpiration: 'Definir expiração',
      },

    registrations: {
      title: 'Inscrições',
      registrationCode: 'Código',
      fullName: 'Nome',
      email: 'E-mail',
      phone: 'Telefone',
      gender: 'Gênero',
      shirtSize: 'Camiseta',
      campo: 'Campo',
      plataforma: 'Plataforma',
      seguidores: 'Seguidores',
      documento: 'Documento',
      conteudo: 'Conteúdo',
      linkOrHandle: 'Link ou @',
      tourNt: 'Tour NT',
      flightDepartureTime: 'Horário voo ida',
      flightReturnTime: 'Horário voo volta',
      visitation: 'Visitação Novo Tempo',
      checkinFilter: 'Check-in',
      checkinDateTimeColumn: 'Data/hora do check-in',
      role: 'Função',
      institution: 'Instituição',
      voucher: 'Voucher',
      language: 'Idioma',
      status: 'Status',
      createdAt: 'Data',
        cancelRegistration: 'Cancelar Inscrição',
        resendEmail: 'Reenviar E-mail',
        resendWhatsApp: 'Enviar confirmação por WhatsApp',
        whatsAppSent: 'Confirmação enviada por WhatsApp com sucesso',
        cancelConfirm: 'Cancelar Inscrição',
        cancelWarning: 'Tem certeza que deseja cancelar esta inscrição? A vaga será devolvida.',
        canceled: 'Inscrição cancelada com sucesso',
        emailResent: 'E-mail reenviado com sucesso',
        emailAlreadySent: 'E-mail já foi enviado anteriormente',
        exportCSV: 'Exportar CSV',
        exportXLSX: 'Exportar XLSX',
        includeCanceled: 'Incluir canceladas',
        onlyConfirmed: 'Apenas confirmadas',
        deleteRegistration: 'Excluir inscrição',
        deleteConfirm: 'Excluir inscrição',
        deleteWarning: 'Tem certeza que deseja excluir esta inscrição? O registro será removido permanentemente e a vaga será devolvida.',
        deleted: 'Inscrição excluída com sucesso',
        reactivateRegistration: 'Ativar novamente',
        reactivated: 'Inscrição ativada com sucesso',
        editRegistration: 'Editar inscrito',
        editRegistrationTitle: 'Editar Inscrito',
        saved: 'Inscrição atualizada com sucesso',
        perPage: 'Por página',
        showingOf: 'Mostrando {from}–{to} de {total}',
        previous: 'Anterior',
        nextPage: 'Próxima',
      },
    },

    email: {
      confirmation: {
        subject: 'Inscrição confirmada — Creators Summit 2026',
        greeting: 'Olá',
        body: 'Sua inscrição para o evento Creators Summit 2026 foi confirmada com sucesso!',
        detailsTitle: 'Detalhes da sua inscrição',
        name: 'Nome',
        email: 'E-mail',
        phone: 'Telefone',
        gender: 'Gênero',
        shirtSize: 'Camiseta',
        role: 'Função',
        institution: 'Instituição',
        registrationCode: 'Código de Registro',
        footer: 'Aguardamos você no evento!',
      },
    },
  },

  'es': {
    common: {
      appName: 'Creators Summit 2026',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      create: 'Crear',
      search: 'Buscar',
      filter: 'Filtrar',
      export: 'Exportar',
      back: 'Volver',
      next: 'Siguiente',
      submit: 'Enviar',
      confirm: 'Confirmar',
      close: 'Cerrar',
      yes: 'Sí',
      no: 'No',
      active: 'Activo',
      inactive: 'Inactivo',
      paused: 'Pausado',
      confirmed: 'Confirmado',
      canceled: 'Cancelado',
      status: 'Estado',
      actions: 'Acciones',
      noResults: 'No se encontraron resultados',
      copyLink: 'Copiar Enlace',
      copiedToClipboard: 'Copiado al portapapeles',
    },

    header: {
      languageSelector: 'Idioma',
      navInscription: 'Inscríbete',
      navCheckStatus: 'Consultar inscripción',
      navWorkshops: 'Talleres / Plenarias',
    },

    publicWorkshops: {
      title: 'Talleres y Plenarias',
      subtitle: 'Conozca las charlas y talleres del evento',
      seeDetails: 'Ver detalles',
      backToWorkshops: 'Volver a talleres',
      noWorkshops: 'No hay talleres ni plenarias disponibles en este momento.',
      errorLoading: 'Error al carregar. Intente de nuevo.',
      typeWorkshop: 'Taller',
      typePlenaria: 'Plenaria',
      session: 'Sesión',
      sessions: 'sesiones',
      sessionsSubtitle: 'Horarios y salas',
      room: 'Sala',
      vagasDisponiveis: 'Cupos disponibles',
      capacity: 'Capacidad',
      speakers: 'Expositores',
      description: 'Descripción',
      speakerBiography: 'Biografía',
    },

    publicInscription: {
      title: 'Inscripción Creators Summit 2026',
      subtitle: 'Complete el formulario para confirmar su participación',
      enterVoucher: 'Ingrese su código de voucher',
      voucherPlaceholder: 'Ej: A1B2C',
      validateVoucher: 'Validar Voucher',
      institution: 'Unión/Institución',
      voucherCodeLabel: 'Código del voucher',
      voucherQuotaRemaining: 'Cupos restantes en el voucher',
      institutionQuotaRemaining: 'Cupos restantes en la institución',
      availableInOneVoucher: 'Visível apenas para admins',
      availableInVouchersCount: 'Visível apenas para admins',
      formTitle: 'Datos del Participante',
      fullName: 'Nombre Completo',
      fullNamePlaceholder: 'Ingrese su nombre completo',
      email: 'Correo Electrónico',
      emailPlaceholder: 'su@email.com',
      phone: 'Teléfono',
      phonePlaceholder: '(11) 99999-9999',
      country: 'País',
      countryPlaceholder: 'Seleccione el país',
      gender: 'Género',
      genderPlaceholder: 'Seleccione',
      shirtSize: 'Talla de Camiseta',
      shirtSizePlaceholder: 'Seleccione',
      campo: 'Campo',
      campoPlaceholder: 'Ingrese el campo',
      plataforma: 'Plataforma',
      plataformaPlaceholder: 'Ej: Instagram, YouTube, TikTok',
      seguidores: 'Seguidores',
      seguidoresPlaceholder: 'Ej: 10000',
      documento: 'Documento',
      documentoPlaceholder: 'DNI, CPF o pasaporte',
      conteudo: 'Contenido',
      conteudoPlaceholder: 'Tipo o descripción del contenido',
      linkOrHandle: 'Link o @',
      linkOrHandlePlaceholder: 'Ej: @tuperfil o https://...',
      wantsToKnowNovoTempo: 'Deseo conocer la estructura de Nuevo Tiempo.',
      tourNt: 'Tour NT',
      flightDepartureTime: 'Horario vuelo ida',
      flightReturnTime: 'Horario vuelo vuelta',
      role: 'Función',
      rolePlaceholder: 'Ej: Administración, Coordinador, Departamental, Designer, Editor(a), Gerente, Productor(a), Secretaria',
      roleOptions: {
        'Administração': 'Administración',
        'Coordenador': 'Coordinador',
        'Departamental': 'Departamental',
        'Designer': 'Designer',
        'Editor(a)': 'Editor(a)',
        'Gerente': 'Gerente',
        'Produtor(a)': 'Productor(a)',
        'Secretária': 'Secretaria',
      },
      submitInscription: 'Confirmar Inscripción',
      successTitle: 'Inscripción confirmada.',
      successMessage: 'Su inscripción se realizó con éxito.',
      registrationCode: 'Código de Registro',
      registrationDetails: 'Detalles de la Inscripción',
      checkEmailConfirmation: 'Verifique su correo electrónico para confirmar los datos de inscripción.',
    },

    checkStatus: {
      title: 'Consultar Inscripción',
      subtitle: 'Ingrese el código de inscripción y el correo para verificar el estado.',
      codeLabel: 'Código de inscripción',
      codePlaceholder: 'Ej: ABC12XY',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'su@email.com',
      checkButton: 'Verificar estado',
      statusConfirmed: 'Inscripción confirmada.',
      statusCanceled: 'Cancelada',
      notFound: 'Inscripción no encontrada. Verifique el código y el correo.',
      fullName: 'Nombre',
      institution: 'Institución',
      institutionGroup: 'Grupo',
      group1: 'Grupo 1',
      group2: 'Grupo 2',
      group3: 'Grupo 3',
      groupColorRed: 'Rojo',
      groupColorGreen: 'Verde',
      groupColorBlue: 'Azul',
      registeredAt: 'Fecha de inscripción',
      workshopsTitle: 'Inscripción en talleres',
      workshopsSubtitle: 'Elija hasta 3 talleres. No puede inscribirse en el mismo taller más de una vez.',
      workshopSelectPlaceholder: 'Seleccione un taller',
      sessionLabel: 'Sesión',
      workshopOptionVagas: 'Cupos',
      saveWorkshops: 'Guardar talleres',
      workshopsSaved: 'Talleres actualizados correctamente.',
      workshopFull: 'Este taller no tiene cupos disponibles.',
      workshopNotFound: 'Taller no encontrado.',
      myQRForCheckin: 'Mi QR Code para registro',
      myQRHint: 'Muestre este QR Code al organizador el día del evento.',
    },

    landing: {
      heroTitle: 'Creators Summit 2026',
      heroSubtitle: 'Evento de comunicación y tecnología. Del 16 al 18 de abril.',
      heroCta: 'Inscribirse',
      speakersTitle: 'Expositores',
      speakersSubtitle: 'Conozca a quienes compartirán conocimiento en el evento.',
      programTitle: 'Programa',
      programSubtitle: 'Talleres y plenarias por día.',
      day16: 'Jueves 16/04',
      day17: 'Viernes 17/04',
      day18: 'Sábado 18/04',
      inscriptionTitle: 'Asegure su lugar',
      inscriptionSubtitle: 'Complete el formulario y confirme su participación en el evento.',
      inscriptionCta: 'Ir a inscripción',
      footerWorkshops: 'Talleres',
      footerInscription: 'Inscripción',
      footerCheckStatus: 'Consultar Inscripción',
      noSpeakers: 'Ningún expositor registrado en este momento.',
      noProgram: 'Ninguna actividad registrada para este día.',
      errorLoading: 'Error al cargar. Intente de nuevo.',
    },

    errors: {
      requiredField: 'Este campo es obligatorio',
      invalidEmail: 'Correo electrónico inválido',
      invalidPhone: 'Teléfono inválido',
      voucherNotFound: 'Voucher inválido o no disponible',
      voucherInactive: 'Este voucher está inactivo',
      voucherExpired: 'Este voucher está expirado',
      voucherNoQuota: 'Cupos agotados para este voucher',
      institutionNoQuota: 'Cupos agotados para esta institución',
      emailAlreadyRegistered: 'Este correo electrónico ya está inscrito',
      registrationFailed: 'Error al procesar la inscripción. Intente nuevamente.',
      genericError: 'Ocurrió un error. Intente nuevamente.',
      unauthorized: 'Acceso no autorizado',
      notFound: 'No encontrado',
      rateLimitExceeded: 'Demasiados intentos. Espere un momento.',
    },

    admin: {
      login: {
        title: 'Acceso Administrativo',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        signIn: 'Ingresar',
        invalidCredentials: 'Correo electrónico o contraseña inválidos',
      },

      nav: {
        dashboard: 'Panel',
        institutions: 'Instituciones',
        rooms: 'Ambientes',
        speakers: 'Ponentes',
        workshops: 'Workshops',
        workshopsAndPlenarias: 'Workshops y Plenarias',
        vouchers: 'Vouchers',
        registrations: 'Inscripciones',
        checkin: 'Registro',
        users: 'Usuarios',
        settings: 'Configuración',
        logout: 'Salir',
      },

      users: {
        title: 'Usuarios',
        createUser: 'Crear usuario',
        createUserDescription: 'El usuario podrá acceder al panel según el perfil elegido. Correo y contraseña se usan en el login en /admin/login.',
        listTitle: 'Usuarios de la plataforma',
        listDescription: 'Usuarios con acceso al panel (administradores y equipo de registro).',
        email: 'Correo electrónico',
        emailPlaceholder: 'ejemplo@email.com',
        password: 'Contraseña',
        passwordPlaceholder: 'Mínimo 8 caracteres',
        role: 'Perfil',
        roleAdmin: 'Administrador',
        roleCheckin: 'Registro (solo check-in en el evento)',
        status: 'Estado',
        createdAt: 'Creado',
        noUsers: 'Ningún usuario registrado.',
        addUser: 'Agregar usuario',
        backToList: 'Volver a la lista',
        submit: 'Crear usuario',
        success: 'Usuario creado correctamente.',
        emailAlreadyExists: 'Este correo ya está en uso.',
        passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
        passwordTooWeak: 'Contraseña muy débil.',
        errorGeneric: 'Error al crear usuario. Intente de nuevo.',
      },

      checkin: {
        title: 'Registro en el evento',
        subtitle: 'Escanea el código QR del participante o ingresa el código para confirmar la asistencia.',
        scanQR: 'Escanear QR',
        scanQRHint: 'Apunta la cámara al código QR del participante (código de inscripción).',
        manualCode: 'O ingresa el código',
        codePlaceholder: 'Ej: MT-000123',
        lookup: 'Buscar',
        confirmFor: '¿Confirmar registro de {name}?',
        confirmCheckin: 'Confirmar registro',
        confirmCheckinCountdown: 'Confirmar registro ({n}s)',
        alreadyCheckedIn: 'Ya se registró',
        success: 'Registro confirmado para {name}.',
        checkinRecordedAt: 'Registrado el {datetime} (hora de Brasilia).',
        scanAnother: 'Escanear otro',
        scanAnotherHint: 'Haz clic en "Escanear otro" para usar la cámara.',
        forceCamera: 'Forzar cámara',
        notFound: 'Inscripción no encontrada.',
        canceled: 'Inscripción cancelada.',
        errorGeneric: 'Error al procesar. Intenta de nuevo.',
      },

      settings: {
        title: 'Configuración',
        changePassword: 'Cambiar contraseña',
        changePasswordDescription: 'Ingrese su contraseña actual y la nueva. La nueva contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.',
        changePasswordRequiredDescription: 'Por seguridad, debe cambiar su contraseña antes de continuar.',
        mustChangePasswordRequired: 'Debe cambiar su contraseña para continuar.',
        passwordRules: 'Mínimo 8 caracteres, con mayúsculas, minúsculas, números y caracteres especiales.',
        currentPassword: 'Contraseña actual',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar nueva contraseña',
        submit: 'Cambiar contraseña',
        success: 'Contraseña actualizada correctamente.',
        wrongPassword: 'La contraseña actual es incorrecta.',
        weakPassword: 'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y caracteres especiales.',
        mismatch: 'La confirmación no coincide con la nueva contraseña.',
        passwordSyncFailed:
          'La contraseña se actualizó, pero el sistema no registró el cambio. Intente de nuevo o contacte soporte.',
      },

      dashboard: {
        title: 'Panel',
        totalRegistrations: 'Total de Inscripciones',
        activeInstitutions: 'Instituciones Activas',
        activeVouchers: 'Vouchers Activos',
        alerts: 'Alertas',
        lowQuotaVouchers: 'Vouchers con Pocos Cupos',
        institutionUsage: 'Inscritos por Unión/Institución',
        institutionName: 'Institución',
        used: 'Usados',
        total: 'Total',
        remaining: 'Restantes',
        noAlerts: 'No hay alertas en este momento',
        workshopsBySection: 'Workshops',
        sessionLabel: 'Sección',
        filledSlots: 'Vagas preenchidas / disponíveis',
      },

      institutions: {
        title: 'Instituciones',
        createNew: 'Nueva Institución',
        name: 'Nombre',
        country: 'País',
        countryPlaceholder: 'Seleccione el país',
        group: 'Grupo',
        group1: 'Grupo 1',
        group2: 'Grupo 2',
        group3: 'Grupo 3',
        filterNamePlaceholder: 'Filtrar por nombre',
        filterCountryAll: 'Todos los países',
        filterGroupAll: 'Todos los grupos',
        quotaTotal: 'Cuota Total',
        usedCount: 'Cupos Usados',
        remaining: 'Restantes',
        status: 'Estado',
        createdAt: 'Creado el',
        editInstitution: 'Editar Institución',
        createInstitution: 'Crear Institución',
        deleteConfirm: 'Eliminar Institución',
        deleteWarning: '¿Está seguro que desea eliminar esta institución?',
        saved: 'Institución guardada con éxito',
        deleted: 'Institución eliminada con éxito',
        total: 'Total',
      },

      rooms: {
        title: 'Ambientes',
        createNew: 'Nuevo Ambiente',
        name: 'Nombre',
        capacity: 'Capacidad',
        status: 'Estado',
        editRoom: 'Editar Ambiente',
        createRoom: 'Crear Ambiente',
        deleteConfirm: 'Eliminar Ambiente',
        deleteWarning: '¿Está seguro que desea eliminar este ambiente?',
        saved: 'Ambiente guardado con éxito',
        deleted: 'Ambiente eliminado con éxito',
      },

      speakers: {
        title: 'Ponentes',
        createNew: 'Nuevo Ponente',
        name: 'Nombre',
        namePlaceholder: 'Nombre del ponente',
        biography: 'Biografía',
        biographyPlaceholder: 'Breve biografía o currículum',
        photo: 'Foto',
        uploadPhoto: 'Subir foto',
        photoUrlPlaceholder: 'URL de la foto (o use el botón para subir)',
        editSpeaker: 'Editar Ponente',
        createSpeaker: 'Registrar Ponente',
        deleteConfirm: 'Eliminar Ponente',
        deleteWarning: '¿Está seguro que desea eliminar este ponente?',
        saved: 'Ponente guardado con éxito',
        deleted: 'Ponente eliminado con éxito',
        photoUploaded: 'Foto subida con éxito',
        uploadNotConfigured:
          'Subida de fotos no configurada. Defina BLOB_READ_WRITE_TOKEN en el proyecto Vercel (Storage > Blob) o use el campo URL de la foto.',
        bucketNotFound:
          'Blob de Vercel no disponible. Configure Blob en el proyecto Vercel (Storage) o use el campo URL de la foto.',
        fileTooLarge: 'Archivo muy grande. Máximo 5 MB.',
      },

      workshops: {
        title: 'Workshops',
        createNew: 'Nuevo Workshop',
        titleLabel: 'Título',
        titlePlaceholder: 'Título del workshop',
        description: 'Descripción',
        descriptionPlaceholder: 'Descripción del workshop',
        room: 'Ambiente',
        roomPlaceholder: 'Seleccione el ambiente',
        noRoom: 'Ninguno',
        speaker: 'Ponente',
        speakers: 'Ponentes',
        speakerPlaceholder: 'Seleccione el ponente',
        noSpeaker: 'Ninguno',
        noSpeakersAvailable: 'Ningún ponente registrado',
        editWorkshop: 'Editar Workshop',
        createWorkshop: 'Crear Workshop',
        deleteConfirm: 'Eliminar Workshop',
        deleteWarning: '¿Está seguro que desea eliminar este workshop?',
        saved: 'Workshop guardado con éxito',
        deleted: 'Workshop eliminado con éxito',
      },

      workshopsAndPlenarias: {
        title: 'Workshops y Plenarias',
        createNew: 'Nuevo',
        filterLabel: 'Filtrar',
        filterAll: 'Todos',
        filterEmpty: 'Ningún elemento para este filtro.',
        typeLabel: 'Tipo',
        typeWorkshop: 'Workshop',
        typePlenaria: 'Plenaria',
        titleLabel: 'Título',
        titlePlaceholder: 'Título del workshop o plenaria',
        description: 'Descripción',
        descriptionPlaceholder: 'Descripción',
        room: 'Ambiente',
        roomPlaceholder: 'Seleccione el ambiente',
        noRoom: 'Ninguno',
        speaker: 'Ponente',
        speakers: 'Ponentes',
        noSpeakersAvailable: 'Ningún ponente registrado',
        editWorkshop: 'Editar',
        createWorkshop: 'Crear',
        deleteConfirm: 'Eliminar',
        deleteWarning: '¿Está seguro que desea eliminar este elemento?',
        saved: 'Guardado con éxito',
        deleted: 'Eliminado con éxito',
        translationEs: 'Traducción (Español)',
      },

      vouchers: {
        title: 'Vouchers',
        createNew: 'Nuevo Voucher',
        code: 'Código',
        institution: 'Institución',
        filterInstitutionPlaceholder: 'Filtrar por nombre de la institución',
        quotaTotal: 'Cuota Total',
        usedCount: 'Cupos Usados',
        remaining: 'Restantes',
        status: 'Estado',
        expiresAt: 'Expira el',
        createdAt: 'Creado el',
        editVoucher: 'Editar Voucher',
        createVoucher: 'Crear Voucher',
        deleteConfirm: 'Eliminar Voucher',
        deleteWarning: '¿Está seguro que desea eliminar este voucher?',
        saved: 'Voucher guardado con éxito',
        deleted: 'Voucher eliminado con éxito',
        generateCode: 'Generar Código',
        codeGenerated: 'Código generado',
        copyInscriptionLink: 'Copiar Enlace de Inscripción',
        linkCopied: 'Enlace copiado',
        noExpiration: 'Sin expiración',
        setExpiration: 'Definir expiración',
      },

      registrations: {
        title: 'Inscripciones',
        registrationCode: 'Código',
        fullName: 'Nombre',
        email: 'Correo Electrónico',
        phone: 'Teléfono',
        gender: 'Género',
        shirtSize: 'Camiseta',
        campo: 'Campo',
        plataforma: 'Plataforma',
        seguidores: 'Seguidores',
        documento: 'Documento',
        conteudo: 'Contenido',
        linkOrHandle: 'Link o @',
        tourNt: 'Tour NT',
        flightDepartureTime: 'Horario vuelo ida',
        flightReturnTime: 'Horario vuelo vuelta',
        visitation: 'Visita Nuevo Tiempo',
        checkinFilter: 'Check-in',
        checkinDateTimeColumn: 'Fecha y hora del check-in',
        role: 'Función',
        institution: 'Institución',
        voucher: 'Voucher',
        language: 'Idioma',
        status: 'Estado',
        createdAt: 'Fecha',
        cancelRegistration: 'Cancelar Inscripción',
        resendEmail: 'Reenviar Correo',
        resendWhatsApp: 'Enviar confirmación por WhatsApp',
        whatsAppSent: 'Confirmación enviada por WhatsApp con éxito',
        cancelConfirm: 'Cancelar Inscripción',
        cancelWarning: '¿Está seguro que desea cancelar esta inscripción? El cupo será devuelto.',
        canceled: 'Inscripción cancelada con éxito',
        emailResent: 'Correo reenviado con éxito',
        emailAlreadySent: 'El correo ya fue enviado anteriormente',
        exportCSV: 'Exportar CSV',
        exportXLSX: 'Exportar XLSX',
        includeCanceled: 'Incluir canceladas',
        onlyConfirmed: 'Solo confirmadas',
        deleteRegistration: 'Eliminar inscripción',
        deleteConfirm: 'Eliminar inscripción',
        deleteWarning: '¿Está seguro que desea eliminar esta inscripción? El registro se eliminará permanentemente y el cupo será devuelto.',
        deleted: 'Inscripción eliminada con éxito',
        reactivateRegistration: 'Activar nuevamente',
        reactivated: 'Inscripción activada con éxito',
        editRegistration: 'Editar inscrito',
        editRegistrationTitle: 'Editar Inscrito',
        saved: 'Inscripción actualizada con éxito',
        perPage: 'Por página',
        showingOf: 'Mostrando {from}–{to} de {total}',
        previous: 'Anterior',
        nextPage: 'Siguiente',
      },
    },

    email: {
      confirmation: {
        subject: 'Inscripción confirmada — Creators Summit 2026',
        greeting: 'Hola',
        body: '¡Su inscripción para el evento Creators Summit 2026 fue confirmada con éxito!',
        detailsTitle: 'Detalles de su inscripción',
        name: 'Nombre',
        email: 'Correo Electrónico',
        phone: 'Teléfono',
        gender: 'Género',
        shirtSize: 'Camiseta',
        role: 'Función',
        institution: 'Institución',
        registrationCode: 'Código de Registro',
        footer: '¡Le esperamos en el evento!',
      },
    },
  },
};

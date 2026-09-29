# 🎬 ScaleMentors Motion Video Hub

Central de produção e catálogo de vídeos de alta conversão, animações em motion design e roteiros multimídia da plataforma **ScaleMentors**.

---

## 📁 Estrutura de Pastas

```
motion/
├── shared/                         # Ativos globais reutilizáveis
│   ├── assets/                     # Logos, ícones vetoriais, trilhas sonoras e SFX
│   │   └── scalementors-logo.svg
│   └── templates/                  # Modelos de roteiro, config.json e boilerplate
│
├── videos/                         # Projetos individuais de vídeo
│   ├── 01-apresentacao-whatsapp/   # Vídeo 01: Apresentação Comercial para WhatsApp (Concluído ✅)
│   │   ├── audio/                  # Áudio bruto, voz tratada e narração sincronizada
│   │   ├── scripts/                # Roteiro, legendas (.srt), copy de envio no WhatsApp
│   │   ├── src/                    # Código da animação (peca.js, config.json, peca.html)
│   │   ├── output/                 # Vídeo final (.mp4) e capa oficial (.png)
│   │   └── build/                  # Cache de renderização e frames temporários
│   │
│   ├── 02-tour-crm-pipeline/       # Vídeo 02: Demonstração do CRM & Automação Inteligente (Planejado 💡)
│   ├── 03-academy-certificados/    # Vídeo 03: Tour do Scale Academy & Emissão de Certificados (Planejado 💡)
│   └── 04-onboarding-mentorado/    # Vídeo 04: Boas-vindas e Primeiro Acesso do Mentorado (Planejado 💡)
│
└── README.md                       # Documentação e guia do hub
```

---

## 🎞️ Catálogo de Vídeos

| ID | Título / Tema | Formato | Duração | Status |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **ScaleMentors: Apresentação Executiva WhatsApp** | Vertical 9:16 (1080x1920) | ~74s | ✅ **Concluído** (`output/ScaleMentors-Apresentacao.mp4`) |
| **02** | **Tour do CRM & Automação Inteligente** | Vertical 9:16 (1080x1920) | ~72s | ✅ **Concluído** (`output/ScaleMentors-CRM-Tour.mp4`) |
| **03** | **Scale Academy, Certificação & Ecossistema VIP** | Vertical 9:16 (1080x1920) | ~67s | ✅ **Concluído** (`output/ScaleMentors-Academy-Tour.mp4`) |
| **04** | **Onboarding VIP do Novo Mentorado** | Vertical 9:16 (1080x1920) | ~60s | 💡 *Planejado / Pronto para Roteiro* |
| **05** | **Cockpit Financeiro & Métricas de Escala (LTV/CAC)** | 16:9 Widescreen | ~90s | 💡 *Planejado / Pitch Institucional* |

---

## 🚀 Como Criar um Novo Vídeo

1. Crie uma pasta dentro de `motion/videos/` com o padrão `XX-nome-do-video/`.
2. Adicione as subpastas `audio/`, `scripts/`, `src/`, `output/` e `build/`.
3. Escreva o roteiro em `scripts/` e forneça o áudio da narração em `audio/`.
4. Configure as fontes, cores e duração em `src/config.json`.
5. Programe as cenas e animações em `src/peca.js`.
6. Renderize o resultado final para `output/`.

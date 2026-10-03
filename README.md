# Online MCQ - ITI Employability Skills (रोजगार कौशल्ये) 🎯📱

> **A Bilingual (Marathi & English) Progressive Web Application (PWA) for ITI Employability Skills MCQ Practice & Examination.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-success.svg)](manifest.json)
[![Questions](https://img.shields.io/badge/Questions-580%20Bilingual-indigo.svg)](questions.json)

---

## 🌟 Key Features

1. **📚 Complete 580 Bilingual Questions Bank:**
   - 12 comprehensive modules covering the complete ITI Employability Skills syllabus.
   - Dual-language display: **मराठी (Marathi)** and **English**.
   - Language switch pills: Bilingual (🌐 दोन्ही), Marathi only (🇮🇳), English only (🇬🇧).

2. **⏱️ Timed Examination Engine:**
   - Random selection of 25 questions per test attempt.
   - 45-Minute countdown timer with dynamic color alerts.
   - Auto-submit when time expires.

3. **👤 Trainee Profile System:**
   - Pre-test registration modal for Trainee Name, Trade, and ITI Name.
   - Clear input placeholders: `उदा. - अविनाश शेषराव डोंगरे / ex. - Avinash Shesharao Dongre`.

4. **📊 Topside Result Summary & Instant PDF Download:**
   - Instant calculation of Score, Percentage, and Pass/Fail status (Passing: 40%).
   - Clean, professional PDF export via `html2pdf.js` with candidate profile and marks summary at the top followed by detailed question review.
   - Fail-safe print fallback for all devices.

5. **📲 Progressive Web App (PWA) & Offline Mode:**
   - Auto-install prompt modal on mobile and desktop browsers.
   - Persistent quick-install button in the header.
   - Pre-caching of all shell assets and question bank via Service Worker (`sw.js`).
   - Works 100% offline without active internet connection.

6. **✨ Modern UI & GSAP Animations:**
   - Powered by GreenSock Animation Platform (`gsap.min.js`).
   - Mobile-first responsive layout tailored for all smartphone screen sizes.

---

## 🗂️ Project Structure

```text
├── index.html                                        # Main Web Application & PWA Shell
├── style.css                                         # Responsive CSS3 Stylesheet & Animations
├── script.js                                         # MCQ Engine, Trainee Modal, Timer & PDF Export
├── sw.js                                             # PWA Service Worker for Offline Caching
├── manifest.json                                     # Web App Manifest Configuration
├── questions.json                                    # 580 Bilingual MCQ Questions (12 Modules)
├── modules_meta.json                                 # Module Metadata & Topics
├── gsap.min.js                                       # GreenSock Animation Platform
├── html2pdf.bundle.min.js                            # Client-side PDF Generation Engine
├── icon-192.png, icon-512.png                        # PWA App Icons
├── icon-maskable-192.png, icon-maskable-512.png       # Android Maskable Adaptive Icons
├── favicon.png                                       # Browser Tab Favicon
├── Employability_Skills_Marathi_English_580_Questions.csv   # Dataset (CSV)
├── Employability_Skills_Marathi_English_580_Questions.xlsx  # Dataset (Excel)
└── Employability_Skills_Marathi_English_580_Questions.json  # Dataset (JSON)
```

---

## 🚀 How to Run Locally

You can run this project using any static web server:

### Using Python:
```bash
python -m http.server 8080
```
Then open your browser and navigate to:
```
http://localhost:8080
```

### Using Node.js / NPX:
```bash
npx serve .
```

---

## 🌐 Deploy to GitHub Pages

1. Go to your repository settings on GitHub: **Settings > Pages**.
2. Under **Build and deployment > Branch**, select `main` and `/ (root)`.
3. Click **Save**.
4. Your PWA will be live at:
   👉 **https://avishinestar.github.io/es/**

---

## 👨‍🏫 Developer & Guide Credits

```text
- Developed By -
Avinash S. Dongre
C.I. COPA
GITI LOHARA DIST. DHARASHIV.
```

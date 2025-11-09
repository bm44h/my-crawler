// server.js - Hyper-Crawler v2.7 (99% Accuracy Edition) - Supabase Integrated

// --- الاعتماديات ---
const express = require('express');
const cheerio = require('cheerio');
const { HuggingFaceTransformersEmbeddings } = require('@langchain/community/embeddings/hf_transformers');
const { chromium } = require('playwright');
const cors = require('cors');
const { Document } = require('@langchain/core/documents');
const { SupabaseVectorStore } = require("@langchain/community/vectorstores/supabase"); // <-- Supabase Integration
const { createClient } = require("@supabase/supabase-js"); // <-- Supabase Integration
const { URL } = require('url'); // لإصلاح مشكلة عدم وجود URL في بيئة Node.js العادية

// --- إعداد الخادم ---
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors()); // <-- تفعيل CORS
app.use(express.json());

// ============================================
// 🧠 نظام الانتظار الذكي المحسن (3 مستويات)
// ============================================

/**
 * @typedef {Object} SmartWaitResult
 * @property {boolean} success
 * @property {string} strategy
 * @property {number} timeSpent
 * @property {number} linksFound
 * @property {number} contentQuality
 * @property {boolean} criticalContentFound
 */

/**
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {number} taskNum
 * @returns {Promise<SmartWaitResult>}
 */
async function intelligentWaitStrategy(page, url, taskNum) {
  const startTime = Date.now();
  let strategy = "unknown";
  let criticalContentFound = false;
  
  try {
    // ========================================
    // المستوى 1️⃣: الانتظار السريع للمحتوى الحرج - محسن
    // ========================================
    console.log(`  [Task ${taskNum}] 🎯 Level 1: Enhanced critical content check...`);
    
    const criticalSelectors = [
      'a[href]',                    // روابط أساسية
      'h1, h2, h3',                 // عناوين
      'main, article, [role="main"]', // محتوى رئيسي
      '[class*="product"], [id*="product"]', // عناصر منتجات
      '.price, [class*="price"]',   // أسعار
      '.product-title, .product-name, [itemprop="name"]', // عناوين منتجات
    ];

    try {
      // 🔥 IMPROVEMENT 1: انتظار محددات المحتوى الحرج مع شرط نجاح
      await page.waitForSelector(criticalSelectors.join(', '), { timeout: 3000 });
      
      // 🔥 IMPROVEMENT 2: التحقق من وجود محددات المنتجات أو العناوين
      const criticalEvaluation = await page.evaluate(() => {
        const productSelectors = [
          '.product-title', '[itemprop="name"]', 'h1',
          '[class*="product-name"]', '[class*="item-title"]'
        ];
        
        const hasProductTitle = productSelectors.some(selector => 
          document.querySelector(selector) !== null
        );
        
        const hasCriticalContent = 
          document.querySelector('h1') !== null ||
          document.querySelector('[class*="product"]') !== null ||
          document.querySelector('.price') !== null;
        
        return {
          links: document.querySelectorAll('a[href]').length,
          hasProductTitle,
          hasCriticalContent
        };
      });

      criticalContentFound = criticalEvaluation.hasProductTitle || criticalEvaluation.hasCriticalContent;
      
      if (criticalEvaluation.links >= 5 || criticalContentFound) {
        strategy = "level1_enhanced_critical";
        console.log(`  [Task ${taskNum}] ✅ Level 1 SUCCESS: Links=${criticalEvaluation.links}, CriticalContent=${criticalContentFound}`);
        const timeSpent = Date.now() - startTime;
        return {
          success: true,
          strategy,
          timeSpent,
          linksFound: criticalEvaluation.links,
          contentQuality: criticalContentFound ? 85 : 70,
          criticalContentFound
        };
      }
    } catch (e) {
      console.log(`  [Task ${taskNum}] ⏭️  Level 1 timeout, proceeding to Level 2...`);
    }

    // ========================================
    // المستوى 2️⃣: انتظار منصات JavaScript الثقيلة (Salla/Zid) - محسن
    // ========================================
    console.log(`  [Task ${taskNum}] 🎯 Level 2: Enhanced platform-specific detection...`);
    
    // كشف منصة سلة/زد محسن
    const platformDetected = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      const isSalla = 
        document.querySelector('script[src*="salla.sa"]') !== null ||
        document.querySelector('[id^="salla-"]') !== null ||
        document.querySelector('[class*="salla"]') !== null ||
        html.includes('salla.sa') ||
        html.includes('salla-bundle');
      
      const isZid = 
        document.querySelector('script[src*="zid.sa"]') !== null ||
        document.querySelector('[class*="zid-"]') !== null ||
        html.includes('zid.sa') ||
        html.includes('zid-platform');
      
      // 🔥 NEW: كشف Next.js مبكر
      const isNextJS = 
        document.querySelector('script#__NEXT_DATA__') !== null ||
        document.querySelector('[data-nextjs]') !== null ||
        html.includes('__NEXT_DATA__');
      
      return { isSalla, isZid, isNextJS };
    });

    // 🔥 IMPROVEMENT 3: انتظار أطول للمحتوى الديناميكي
    let dynamicWaitTime = 8000;
    if (platformDetected.isNextJS) {
      dynamicWaitTime = 12000; // انتظار أطول لتطبيقات Next.js
      console.log(`  [Task ${taskNum}] ⚛️  Detected Next.js - extended wait to ${dynamicWaitTime}ms`);
    }

    if (platformDetected.isSalla || platformDetected.isZid || platformDetected.isNextJS) {
      const platform = platformDetected.isSalla ? "Salla" : 
                      platformDetected.isZid ? "Zid" : "NextJS";
      console.log(`  [Task ${taskNum}] 🏪 Detected ${platform} platform - applying enhanced JS wait...`);
      
      // انتظار تحميل الشبكة مع وقت أطول
      await page.waitForLoadState('networkidle', { timeout: dynamicWaitTime }).catch(() => {});
      
      // انتظار إضافي للمحتوى الحرج
      const criticalContentSelectors = [
        '.product-title, [itemprop="name"]',
        'h1, h2',
        '.price, [class*="price"]',
        '[class*="product"]',
        'main, [role="main"]'
      ];

      for (const selector of criticalContentSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          criticalContentFound = true;
          break;
        } catch (e) {
          // تجاهل - نحاول التالي
        }
      }

      // تقييم نهائي محسن
      const finalEval = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href]').length;
        const hasH1 = document.querySelector('h1') !== null;
        const hasProductInfo = 
          document.querySelector('[itemprop="name"]') !== null ||
          document.querySelector('.product-title, .product-name') !== null ||
          document.querySelector('[class*="product"] h1') !== null;
        
        const hasCriticalContent = hasH1 || hasProductInfo;
        
        return { links, hasH1, hasProductInfo, hasCriticalContent };
      });

      criticalContentFound = finalEval.hasCriticalContent;
      strategy = `level2_${platform.toLowerCase()}_enhanced`;
      
      console.log(`  [Task ${taskNum}] ✅ Level 2 SUCCESS: Links=${finalEval.links}, CriticalContent=${criticalContentFound}`);
      
      const timeSpent = Date.now() - startTime;
      return {
        success: finalEval.links >= 3 || criticalContentFound,
        strategy,
        timeSpent,
        linksFound: finalEval.links,
        contentQuality: criticalContentFound ? 90 : 75,
        criticalContentFound
      };
    }

    // ========================================
    // المستوى 3️⃣: انتظار المحتوى الديناميكي العام - محسن
    // ========================================
    console.log(`  [Task ${taskNum}] 🎯 Level 3: Enhanced dynamic content wait...`);
    
    // انتظار تحميل الشبكة
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    
    // انتظار ذكي للمحتوى المهم مع محددات محسنة
    const enhancedContentSelectors = [
      '.product-title, [itemprop="name"], h1',
      '.product-description, [itemprop="description"]',
      '.price, [itemprop="price"], [class*="price"]',
      'button:has-text("إضافة"), button:has-text("Add to cart"), button:has-text("شراء")',
      'main, article, [role="main"]',
      '[class*="product"], [id*="product"]'
    ];

    for (const selector of enhancedContentSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        criticalContentFound = true;
      } catch (e) {
        // تجاهل - نحاول التالي
      }
    }

    // تقييم نهائي محسن
    const finalEval = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]').length;
      const hasH1 = document.querySelector('h1') !== null;
      const hasProductInfo = 
        document.querySelector('[itemprop="name"]') !== null ||
        document.querySelector('.product-title, .product-name') !== null ||
        document.querySelector('[class*="product"] h1') !== null;
      
      const hasCriticalContent = hasH1 || hasProductInfo;
      
      return { links, hasH1, hasProductInfo, hasCriticalContent };
    });

    criticalContentFound = finalEval.hasCriticalContent;
    strategy = "level3_enhanced_dynamic";
    const timeSpent = Date.now() - startTime;
    
    console.log(`  [Task ${taskNum}] ✅ Level 3 COMPLETE: Links=${finalEval.links}, CriticalContent=${criticalContentFound}`);
    
    return {
      success: finalEval.links >= 3 || criticalContentFound,
      strategy,
      timeSpent,
      linksFound: finalEval.links,
      contentQuality: criticalContentFound ? 85 : 65,
      criticalContentFound
    };

  } catch (error) {
    console.log(`  [Task ${taskNum}] ⚠️  Wait strategy failed: ${error}`);
    const timeSpent = Date.now() - startTime;
    return {
      success: false,
      strategy: "fallback",
      timeSpent,
      linksFound: 0,
      contentQuality: 20,
      criticalContentFound: false
    };
  }
}

// ============================================
// 🧠 الدوال المساعدة المحسنة
// ============================================

/**
 * @typedef {Object} PageClassification
 * @property {string} category
 * @property {number} confidence
 * @property {string[]} signals
 * @property {("salla"|"zid"|"nextjs"|"generic")} [platform]
 */

/**
 * @typedef {Object} CrawlGoals
 * @property {boolean} storeName
 * @property {boolean} shipping
 * @property {boolean} returns
 * @property {number} products
 */

/**
 * @param {string} url
 * @param {string} html
 * @returns {PageClassification}
 */
function intelligentPageClassifier(url, html) {
  const $ = cheerio.load(html);
  const decodedUrl = decodeURIComponent(url).toLowerCase();
  const pageText = $("body").text().toLowerCase();
  const title = $("title").text().toLowerCase();
  const signals = [];
  let platform = "generic";

  if ($("script[src*='salla.sa']").length > 0) {
    platform = "salla";
    signals.push("platform_salla");
  } else if ($("script[src*='zid.sa']").length > 0) {
    platform = "zid";
    signals.push("platform_zid");
  } else if ($("script#__NEXT_DATA__").length > 0) {
    platform = "nextjs";
    signals.push("platform_nextjs");
  }

  const productScoreRules = [
    { test: () => decodedUrl.match(/\/(products?|product|item|p)\//), weight: 30, signal: "product_url_pattern" },
    { test: () => $("meta[property='og:type'][content='product']").length > 0, weight: 40, signal: "og_product" },
    { test: () => $("script[type='application/ld+json']").text().includes('"@type":"Product"'), weight: 50, signal: "json_ld_product" },
    { test: () => platform === "salla" && $(".details-container").length > 0, weight: 60, signal: "salla_product_container" },
    { test: () => platform === "zid" && $(".z-product-page").length > 0, weight: 60, signal: "zid_product_page" },
    { test: () => $("button[type='submit']:contains('إضافة للسلة'), .add-to-cart, #add-to-cart").length > 0, weight: 35, signal: "add_to_cart_button" },
    { test: () => platform === "nextjs" && ($("h1").length > 0 && $(".price, [class*='price']").length > 0), weight: 55, signal: "nextjs_h1_price" },
    { test: () => $("button:contains('Add'), button:contains('أضف'), button:contains('اشتر')").length > 0, weight: 30, signal: "buy_button" },
    { test: () => $("[class*='product'], [id*='product']").length > 3, weight: 25, signal: "product_classes" },
  ];
  const productScore = productScoreRules.reduce((score, rule) => {
    if (rule.test()) {
      signals.push(rule.signal);
      return score + rule.weight;
    }
    return score;
  }, 0);

  // 🔥 NEW: تصنيف صفحات الفئات
  const categoryScoreRules = [
    { test: () => decodedUrl.match(/\/(categories?|category|collections?|collection|shop|store|متجر|فئات|مجموعات)\//), weight: 35, signal: "category_url_pattern" },
    { test: () => $("[class*='category'], [class*='collection']").length > 0, weight: 25, signal: "category_classes" },
    { test: () => $(".products-grid, .product-list, .items-grid, [class*='products']").length > 0, weight: 40, signal: "product_list_container" },
    { test: () => $(".product-item, .product-card, [class*='product-']").length >= 3, weight: 50, signal: "multiple_product_items" },
    { test: () => $("h1:contains('Category'), h1:contains('Collection'), h1:contains('فئات'), h1:contains('مجموعات')").length > 0, weight: 30, signal: "category_title" },
  ];
  const categoryScore = categoryScoreRules.reduce((score, rule) => {
    if (rule.test()) {
      signals.push(rule.signal);
      return score + rule.weight;
    }
    return score;
  }, 0);

  // 🔥 IMPROVEMENT 2: إزالة صفحات السياسات من قائمة التجاهل
  const shippingKeywords = ["شحن", "توصيل", "shipping", "delivery", "dispatch", "courier", "الشحن", "التوصيل"];
  const shippingScore = [
    { test: () => shippingKeywords.some(k => decodedUrl.includes(k)), weight: 40, signal: "shipping_url" },
    { test: () => shippingKeywords.some(k => title.includes(k)), weight: 35, signal: "shipping_title" },
    { test: () => shippingKeywords.some(k => pageText.includes(k)) && pageText.length < 5000, weight: 20, signal: "shipping_content" },
  ].reduce((score, s) => s.test() ? (signals.push(s.signal), score + s.weight) : score, 0);

  const returnKeywords = ["return", "refund", "استرجاع", "استبدال", "exchange", "رجوع", "إرجاع", "الاسترجاع", "الاستبدال"];
  const returnScore = [
    { test: () => returnKeywords.some(k => decodedUrl.includes(k)), weight: 40, signal: "return_url" },
    { test: () => returnKeywords.some(k => title.includes(k)), weight: 35, signal: "return_title" },
    { test: () => returnKeywords.some(k => pageText.includes(k)) && pageText.length < 5000, weight: 20, signal: "return_content" },
  ].reduce((score, s) => s.test() ? (signals.push(s.signal), score + s.weight) : score, 0);

  // 🔥 IMPROVEMENT 2: تحديث أنماط التجاهل (إزالة صفحات السياسات)
  const ignorePatterns = [
    /\/(cart|checkout|login|register|account|profile|wishlist|password)/i,
    /\/(سلة|سلتي|حسابي|الدفع|تسجيل|مقارنة|المفضلة)/,
    /\/(blogs|contact|about|faq)/i, // إزالة pages, tos, privacy من التجاهل
    /\.(pdf|jpg|jpeg|png|gif|svg|css|js|json|xml)$/i,
  ];
  if (ignorePatterns.some(p => p.test(decodedUrl))) {
    return { category: "ignore", confidence: 100, signals: ["ignore_pattern"], platform };
  }

  const scores = [
    { category: "product_page", score: productScore },
    { category: "category_page", score: categoryScore },
    { category: "shipping", score: shippingScore },
    { category: "returns", score: returnScore },
  ];
  const best = scores.reduce((max, curr) => curr.score > max.score ? curr : max);

  if (best.score >= 60) {
    return { category: best.category, confidence: Math.min(100, best.score), signals, platform };
  }
  return { category: "general", confidence: 0, signals: ["no_clear_match"], platform };
}

/**
 * @param {cheerio.CheerioAPI} $
 * @param {PageClassification['platform']} platform
 * @returns {{ name: string; description: string }}
 */
function extractProductInfo($, platform) {
  try {
    const jsonLdScript = $("script[type='application/ld+json']");
    for (let i = 0; i < jsonLdScript.length; i++) {
      const scriptContent = $(jsonLdScript[i]).html();
      if (scriptContent && scriptContent.includes('"@type":"Product"')) {
        const productJson = JSON.parse(scriptContent);
        const name = productJson.name;
        const description = productJson.description;
        if (name && description) {
          console.log("  [Extractor] 💡 Extracted from JSON-LD.");
          return { name, description: description.replace(/\s+/g, " ").trim() };
        }
      }
    }
  } catch (e) {
    console.log("  [Extractor] ⚠️ Could not parse JSON-LD.");
  }

  let name = "";
  let description = "";

  // 🔥 IMPROVEMENT 5: تحديد حاوية المنتج الرئيسية أولاً
  const productContainers = [
    '.product-details', '.product-info', '.product-container',
    '.product-page', '.product-detail', '.product__info',
    '.product__details', '.product-main', '.product-content',
    '.product-summary', '.details-container', '.z-product-page'
  ];

  let productContainer = null;
  for (const container of productContainers) {
    const $container = $(container).first();
    if ($container.length > 0) {
      productContainer = $container;
      console.log(`  [Extractor] 🔍 Found product container: ${container}`);
      break;
    }
  }

  if (platform === 'salla') {
    name = $(".details-container h1.product-title").text().trim();
    if (!name && productContainer) {
      name = productContainer.find("h1.product-title, h1").first().text().trim();
    }
    description = $(".product-description").text().trim();
    if (!description && productContainer) {
      description = productContainer.find(".product-description, .description").first().text().trim();
    }
    if(name) console.log("  [Extractor] 💡 Extracted using Salla-specific selectors.");
  } else if (platform === 'zid') {
    name = $(".z-product-page__title-text").text().trim();
    if (!name && productContainer) {
      name = productContainer.find(".z-product-page__title-text, h1").first().text().trim();
    }
    description = $(".z-product-page__description").text().trim();
    if (!description && productContainer) {
      description = productContainer.find(".z-product-page__description, .description").first().text().trim();
    }
    if(name) console.log("  [Extractor] 💡 Extracted using Zid-specific selectors.");
  }

  // 🔥 IMPROVEMENT 5: البحث داخل حاوية المنتج أولاً
  if (!name && productContainer) {
    name = productContainer.find("h1[itemprop='name'], .product-title, .product-name, h1").first().text().trim();
  }
  if (!description && productContainer) {
    description = productContainer.find("[itemprop='description'], .product-description, .description").first().text().trim();
  }
  
  // الاستراتيجية العدوانية فقط إذا فشل الاستخراج من الحاوية
  if (!name) {
    name = $("h1[itemprop='name'], .product-title, .product-name, h1").first().text().trim();
  }
  if (!description) {
    description = $("[itemprop='description'], .product-description, .description").first().text().trim();
  }
  
  if (!name) {
    name = $("h1, [class*='title'] h1, [class*='product'] h1").first().text().trim();
  }
  if (!description) {
    // البحث في النصوص الطويلة فقط داخل المحتوى الرئيسي
    const mainContent = $("main, article, [role='main'], .main-content").first();
    const possibleDesc = mainContent.find("p, [class*='desc'], [class*='detail'], [class*='info']")
      .map((i, el) => $(el).text().trim())
      .get()
      .filter(text => text.length > 50 && text.length < 2000 && !text.includes('©') && !text.includes('سياسة'))
      .slice(0, 3)
      .join(" ");
    if (possibleDesc) description = possibleDesc;
  }
  
  if (!name) {
    name = $("meta[property='og:title']").attr("content") || $("title").text().split(/[|\-–—]/)[0].trim();
  }
  if (!description) {
    description = $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "";
  }

  return { name, description: description.replace(/\s+/g, " ").trim() };
}

/**
 * @param {cheerio.CheerioAPI} $
 * @returns {string}
 */
function cleanContent($) {
  const unwantedSelectors = ["script", "style", "noscript", "iframe", "nav", "header", "footer", ".menu", ".navigation", ".advertisement", ".ads", ".social-share", ".cookie-banner", ".popup", ".modal"];
  unwantedSelectors.forEach(selector => $(selector).remove());
  let mainContent = $("main, article, [role=\"main\"], .main-content, .content, #content, .product-details, .page-content").first().text();
  if (!mainContent || mainContent.length < 100) mainContent = $("body").text();
  return mainContent.replace(/\s+/g, " ").replace(/[\n\r]+/g, "\n").trim();
}

/**
 * @param {cheerio.CheerioAPI} $
 * @param {PageClassification['platform']} platform
 * @returns {string}
 */
function extractStoreName($, platform) {
  let storeName = "";
  
  // محددات Salla المحددة
  if (platform === 'salla') {
    storeName = $("meta[property='og:site_name']").attr("content") || 
                $(".store-name, [class*='store-name'], [class*='brand-name']").first().text().trim() ||
                $("a.logo img, .site-logo img, [class*='logo'] img").first().attr("alt") || "";
  }
  // محددات Zid المحددة
  else if (platform === 'zid') {
    storeName = $("meta[property='og:site_name']").attr("content") || 
                $(".z-store-name, [class*='store-info'] h1, [class*='merchant-name']").first().text().trim() ||
                $(".logo img, [class*='logo'] img").first().attr("alt") || "";
  }
  // محددات عامة محسنة
  else {
    storeName = $("meta[property='og:site_name']").attr("content") || 
                $("title").text().split(/[|\-–—]/)[0].trim() || 
                $(".logo img, .site-logo img, [class*=\"logo\"] img").first().attr("alt") || 
                $("h1:first").text().trim() || "";
  }

  // تنظيف اسم المتجر
  storeName = storeName
    .replace(/(search|cart|arrow|menu|login|account|home|main|page|website|site|web)/gi, "")
    .replace(/[^\w\u0600-\u06FF\s\-&]/g, "")
    .trim();

  return storeName.length > 2 && storeName.length < 100 ? storeName : "";
}

// --- نقطة الدخول الرئيسية (Express Route) ---
app.post('/crawl', async (req, res) => {
  const startTime = Date.now();
  let browser = null;

  try {
    const { url: baseUrl, projectId } = req.body; 

    if (!baseUrl || !projectId) {
      return res.status(400).json({ error: "URL and projectId are required" });
    }

    console.log(`\n${"=".repeat(60)}\n⚡ HYPER-CRAWLER v2.7 (Supabase Edition) ⚡`);
    console.log(`📈 Goals: 1 Store Name, 1 Shipping, 1 Returns, 27 Products\n${"=".repeat(60)}\n`);

    const MAX_CONCURRENT_TASKS = 5;
    const GOAL_PATIENCE_THRESHOLD = 50;
    const MAX_URL_QUEUE_SIZE = 300;

    // ✅ [الحل النهائي والدائم] إعداد Supabase Vector Store
    console.log("[Embeddings] Initializing HuggingFace embeddings...");
    const embeddings = new HuggingFaceTransformersEmbeddings({ modelName: "Xenova/multilingual-e5-base" });

    // أنشئ عميل Supabase باستخدام متغيرات البيئة
    const privateKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!privateKey || !url) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL environment variables must be set.");
    }
    const client = createClient(url, privateKey);

    // احذف البيانات القديمة المتعلقة بالمشروع (مهم جدًا)
    // يجب أن يكون لديك Row Level Security (RLS) مُعطلة أو سياسة تسمح لـ service_role_key بالحذف
    await client.from('documents').delete().match({ 'metadata->>projectId': projectId });
    console.log(`[Supabase] Deleted old documents for project: ${projectId}`);

    // أنشئ مخزن المتجهات
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: "documents",
      queryName: "match_documents",
    });
    console.log("[Supabase] Vector store initialized successfully.");


    browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
    const context = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" });
    await context.route("**/*", (route) => {
      if (["image", "stylesheet", "font", "media"].includes(route.request().resourceType())) route.abort();
      else route.continue();
    });
    console.log(`[Playwright] Browser is ready.`);

    /** @type {CrawlGoals} */
    const goals = { storeName: false, shipping: false, returns: false, products: 0 };
    const urlsToVisit = new Map([[baseUrl, 100]]);
    const visitedUrls = new Set();
    let totalDocumentsProcessed = 0;
    const waitStrategyStats = new Map();

    /**
     * @param {string} url
     * @param {number} taskNum
     * @returns {Promise<void>}
     */
    const processUrlTask = async (url, taskNum) => {
      console.log(`  [Task ${taskNum}] ➡️  Visiting: ${url}`);
      const page = await context.newPage();
      let htmlContent = null;
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        // 🎯 تطبيق نظام الانتظار الذكي المحسن
        const waitResult = await intelligentWaitStrategy(page, url, taskNum);
        
        // تتبع إحصائيات الاستراتيجيات
        waitStrategyStats.set(waitResult.strategy, (waitStrategyStats.get(waitResult.strategy) || 0) + 1);
        
        console.log(`  [Task ${taskNum}] 📊 Wait Result: Strategy='${waitResult.strategy}', Time=${waitResult.timeSpent}ms, Links=${waitResult.linksFound}, Quality=${waitResult.contentQuality}%, CriticalContent=${waitResult.criticalContentFound}`);

        // أخذ HTML بعد الانتظار
        htmlContent = await page.content();
        console.log(`  [Task ${taskNum}] 📄 Fresh HTML captured after wait (${htmlContent.length} chars)`);

      } catch (error) {
        console.error(`  [Task ${taskNum}] ❌ Error during page processing: ${error.name}`);
        await page.close();
        return;
      }

      await page.close();

      const $ = cheerio.load(htmlContent);
      
      // 🔥 IMPROVEMENT 7: زيادة أولوية روابط السياسات
      $("a[href]").each((i, link) => {
        if (urlsToVisit.size >= MAX_URL_QUEUE_SIZE) return;
        try {
          const href = $(link).attr("href");
          if (!href) return;
          // استخدام URL من 'url' module
          const absoluteUrl = new URL(href, baseUrl).toString().split("#")[0].split("?")[0];
          if (absoluteUrl.startsWith(baseUrl) && !visitedUrls.has(absoluteUrl) && !urlsToVisit.has(absoluteUrl)) {
            let priority = 1;
            const linkText = $(link).text().toLowerCase();
            const decodedUrl = decodeURIComponent(absoluteUrl).toLowerCase();
            
            // 🔥 IMPROVEMENT 7: أولوية عالية لروابط السياسات
            const policyPatterns = [
              'shipping', 'delivery', 'شحن', 'توصيل',
              'return', 'refund', 'استرجاع', 'استبدال',
              'policy', 'سياسة', 'shipping-policy', 'return-policy'
            ];
            
            const isPolicyUrl = policyPatterns.some(pattern => decodedUrl.includes(pattern) || linkText.includes(pattern));
            if (isPolicyUrl) {
              priority = 10; // أولوية عالية لصفحات السياسات
            } else if (decodedUrl.match(/\/(products?|product|item|p)\//)) {
              priority = 5; // أولوية متوسطة لصفحات المنتجات
            } else if (decodedUrl.match(/\/(categories?|category|collections?|collection|shop|store|متجر|فئات|مجموعات)\//)) {
              priority = 3; // أولوية منخفضة لصفحات الفئات
            }

            urlsToVisit.set(absoluteUrl, priority);
          }
        } catch (e) {
          // تجاهل الروابط غير الصالحة
        }
      });

      // 🎯 تصنيف الصفحة
      const classification = intelligentPageClassifier(url, htmlContent);
      console.log(`  [Task ${taskNum}] 🏷️  Classification: ${classification.category} (Conf: ${classification.confidence}%, Platform: ${classification.platform})`);

      if (classification.category === "ignore") {
        console.log(`  [Task ${taskNum}] 🗑️  Ignored URL based on pattern.`);
        return;
      }

      // 🎯 استخراج اسم المتجر (هدف)
      if (!goals.storeName) {
        const storeName = extractStoreName($, classification.platform);
        if (storeName) {
          goals.storeName = true;
          console.log(`  [Task ${taskNum}] 🏆 GOAL ACHIEVED: Store Name found: ${storeName}`);
          // إضافة اسم المتجر كمستند
          const storeDoc = new Document({
            pageContent: `اسم المتجر: ${storeName}`,
            metadata: {
              projectId,
              source: baseUrl,
              type: "store_name",
              url: baseUrl,
            },
          });
          // ✅ [Supabase] إضافة المستند
          await vectorStore.addDocuments([storeDoc]);
          totalDocumentsProcessed++;
        }
      }

      // 🎯 استخراج سياسات الشحن والإرجاع (أهداف)
      if (classification.category === "shipping" && !goals.shipping) {
        const content = cleanContent($);
        if (content.length > 100) {
          goals.shipping = true;
          console.log(`  [Task ${taskNum}] 🏆 GOAL ACHIEVED: Shipping Policy found.`);
          const shippingDoc = new Document({
            pageContent: `سياسة الشحن والتوصيل: ${content}`,
            metadata: {
              projectId,
              source: url,
              type: "shipping_policy",
              url,
            },
          });
          // ✅ [Supabase] إضافة المستند
          await vectorStore.addDocuments([shippingDoc]);
          totalDocumentsProcessed++;
        }
      }

      if (classification.category === "returns" && !goals.returns) {
        const content = cleanContent($);
        if (content.length > 100) {
          goals.returns = true;
          console.log(`  [Task ${taskNum}] 🏆 GOAL ACHIEVED: Returns Policy found.`);
          const returnsDoc = new Document({
            pageContent: `سياسة الاسترجاع والاستبدال: ${content}`,
            metadata: {
              projectId,
              source: url,
              type: "returns_policy",
              url,
            },
          });
          // ✅ [Supabase] إضافة المستند
          await vectorStore.addDocuments([returnsDoc]);
          totalDocumentsProcessed++;
        }
      }

      // 🎯 استخراج بيانات المنتج (هدف)
      if (classification.category === "product_page" && goals.products < GOAL_PATIENCE_THRESHOLD) {
        const { name, description } = extractProductInfo($, classification.platform);
        if (name && description && description.length > 50) {
          goals.products++;
          console.log(`  [Task ${taskNum}] 🏆 GOAL ACHIEVED: Product found: ${name} (Total: ${goals.products})`);
          const productDoc = new Document({
            pageContent: `منتج: ${name}. الوصف: ${description}`,
            metadata: {
              projectId,
              source: url,
              type: "product",
              url,
              product_name: name,
            },
          });
          // ✅ [Supabase] إضافة المستند
          await vectorStore.addDocuments([productDoc]);
          totalDocumentsProcessed++;
        }
      }
      
      // 🎯 إضافة المحتوى العام (لصفحات الفئات والصفحات العامة)
      if (classification.category === "general" || classification.category === "category_page") {
        const content = cleanContent($);
        if (content.length > 200) {
          const generalDoc = new Document({
            pageContent: content,
            metadata: {
              projectId,
              source: url,
              type: classification.category === "category_page" ? "category_page" : "general_content",
              url,
            },
          });
          // ✅ [Supabase] إضافة المستند
          await vectorStore.addDocuments([generalDoc]);
          totalDocumentsProcessed++;
        }
      }
    };

    // ============================================
    // 🚀 حلقة الزحف الرئيسية
    // ============================================
    let taskCounter = 0;
    let totalUrlsCrawled = 0;
    let patienceCounter = 0;

    while (urlsToVisit.size > 0 && patienceCounter < GOAL_PATIENCE_THRESHOLD) {
      // فرز الروابط حسب الأولوية (الأعلى أولاً)
      const sortedUrls = Array.from(urlsToVisit.entries()).sort(([, p1], [, p2]) => p2 - p1);
      const urlsToProcess = sortedUrls.slice(0, MAX_CONCURRENT_TASKS);
      
      if (urlsToProcess.length === 0) break;

      const tasks = urlsToProcess.map(([url]) => {
        urlsToVisit.delete(url);
        visitedUrls.add(url);
        taskCounter++;
        return processUrlTask(url, taskCounter);
      });

      await Promise.all(tasks);
      totalUrlsCrawled += tasks.length;

      // تحديث عداد الصبر
      if (goals.storeName && goals.shipping && goals.returns && goals.products >= 27) {
        console.log("✅ All primary goals met. Exiting crawl loop.");
        break;
      }
      
      // إذا لم يتم تحقيق أي هدف جديد في هذه الدورة، زد عداد الصبر
      const goalsMet = goals.storeName + goals.shipping + goals.returns + goals.products;
      if (goalsMet === patienceCounter) {
          patienceCounter++;
      } else {
          patienceCounter = goalsMet; // إعادة تعيين عداد الصبر بناءً على الأهداف المكتملة
      }

      console.log(`\n--- Cycle Summary ---`);
      console.log(`Goals: StoreName=${goals.storeName}, Shipping=${goals.shipping}, Returns=${goals.returns}, Products=${goals.products}/27`);
      console.log(`Queue Size: ${urlsToVisit.size}, Crawled: ${totalUrlsCrawled}, Patience: ${patienceCounter}/${GOAL_PATIENCE_THRESHOLD}`);
      console.log(`---------------------\n`);
    }

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ Crawling Finished!`);
    console.log(`Total URLs Crawled: ${totalUrlsCrawled}`);
    console.log(`Total Documents Processed: ${totalDocumentsProcessed}`);
    console.log(`Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`Wait Strategy Stats:`, Object.fromEntries(waitStrategyStats));
    console.log(`${"=".repeat(60)}\n`);

    res.json({
      status: "success",
      message: "Crawling and vector embedding completed successfully.",
      summary: {
        urls_crawled: totalUrlsCrawled,
        documents_processed: totalDocumentsProcessed,
        goals_achieved: goals,
        time_seconds: totalTime.toFixed(2),
      },
    });

  } catch (error) {
    console.error("🚨 CRITICAL ERROR IN CRAWL ROUTE:", error);
    res.status(500).json({
      status: "error",
      message: "An internal server error occurred during the crawl process.",
      details: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// --- بدء الخادم ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

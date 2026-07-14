// api/scrape.js - Version avec Puppeteer (plus fiable)
const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;

    if (!url || !url.includes('aliexpress.com')) {
        return res.status(400).json({ success: false, error: 'URL invalide' });
    }

    try {
        console.log('🚀 Lancement de Puppeteer pour:', url);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Simuler un navigateur normal
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Extraction du prix
        let price = null;
        let title = 'Produit inconnu';

        // Méthode 1: Sélecteur principal du prix
        try {
            price = await page.$eval('.product-price-value', el => el.innerText.trim());
        } catch (e) {
            // Méthode 2: Autre sélecteur
            try {
                price = await page.$eval('.price', el => el.innerText.trim());
            } catch (e2) {
                // Méthode 3: Recherche par expression régulière
                try {
                    const html = await page.content();
                    const match = html.match(/\$(\d+\.\d{2})/);
                    if (match) {
                        price = match[1];
                    } else {
                        const euroMatch = html.match(/€(\d+\.\d{2})/);
                        if (euroMatch) {
                            price = euroMatch[1];
                        }
                    }
                } catch (e3) {
                    price = null;
                }
            }
        }

        // Extraction du titre
        try {
            title = await page.$eval('.product-title-text', el => el.innerText.trim());
        } catch (e) {
            try {
                title = await page.$eval('h1', el => el.innerText.trim());
            } catch (e2) {
                title = 'Produit AliExpress';
            }
        }

        await browser.close();

        // Nettoyer le prix
        let cleanedPrice = price;
        if (cleanedPrice) {
            const match = cleanedPrice.match(/(\d+\.\d{2})/);
            if (match) {
                cleanedPrice = match[1];
            } else {
                const matchSimple = cleanedPrice.match(/(\d+)/);
                if (matchSimple) {
                    cleanedPrice = matchSimple[1] + '.00';
                }
            }
        }

        if (!cleanedPrice || cleanedPrice === '0.00') {
            return res.status(404).json({ success: false, error: 'Prix non trouvé' });
        }

        console.log('✅ Prix trouvé:', cleanedPrice);
        console.log('✅ Titre:', title);

        res.json({
            success: true,
            product: {
                title: title || 'Produit AliExpress',
                price: cleanedPrice,
                priceRaw: '$' + cleanedPrice,
                url: url
            }
        });

    } catch (error) {
        console.error('❌ Erreur Puppeteer:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erreur de scraping: ' + error.message
        });
    }
};
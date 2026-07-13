// api/scrape.js
const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;

    if (!url || !url.includes('aliexpress.com')) {
        return res.status(400).json({ 
            success: false, 
            error: 'Veuillez fournir une URL AliExpress valide.' 
        });
    }

    try {
        console.log('Scraping:', url);
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        let price = null;
        let title = 'Produit inconnu';

        try {
            price = await page.$eval('.product-price-value', el => el.innerText.trim());
        } catch (e) {
            try {
                price = await page.$eval('.price', el => el.innerText.trim());
            } catch (e2) {
                try {
                    price = await page.evaluate(() => {
                        const elements = document.querySelectorAll('*');
                        for (let el of elements) {
                            const text = el.innerText;
                            if (text && text.match(/\$\d+\.\d{2}/)) {
                                return text.match(/\$\d+\.\d{2}/)[0];
                            }
                        }
                        return null;
                    });
                } catch (e3) {
                    price = 'Prix non trouvé';
                }
            }
        }

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

        res.json({
            success: true,
            product: {
                title: title,
                price: cleanedPrice || '0.00',
                priceRaw: price || 'Prix non trouvé',
                url: url
            }
        });

    } catch (error) {
        console.error('Erreur de scraping:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'analyse du produit: ' + error.message
        });
    }
};
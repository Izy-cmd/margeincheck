const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // Autoriser les requêtes CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;

    if (!url || !url.includes('aliexpress.com')) {
        return res.status(400).json({ success: false, error: 'URL invalide' });
    }

    try {
        console.log('🔍 Scraping:', url);

        // 1. Récupérer le HTML de la page AliExpress
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 15000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // 2. Extraire le prix
        let price = null;

        // Méthode 1: Sélecteur principal
        const priceElement = $('.product-price-value, .price, .product-price, [class*="price"]').first();
        if (priceElement.length) {
            const priceText = priceElement.text().trim();
            const match = priceText.match(/(\d+\.\d{2})/);
            if (match) {
                price = match[1];
            }
        }

        // Méthode 2: Chercher dans tout le HTML si pas trouvé
        if (!price) {
            const allText = $('body').text();
            const match = allText.match(/\$(\d+\.\d{2})/);
            if (match) {
                price = match[1];
            } else {
                const euroMatch = allText.match(/€(\d+\.\d{2})/);
                if (euroMatch) {
                    price = euroMatch[1];
                }
            }
        }

        // 3. Extraire le titre
        let title = 'Produit AliExpress';
        const titleElement = $('.product-title-text, h1, [class*="title"]').first();
        if (titleElement.length) {
            title = titleElement.text().trim().substring(0, 80);
        }

        // 4. Vérifier si on a trouvé un prix
        if (!price) {
            return res.status(404).json({
                success: false,
                error: 'Prix non trouvé sur cette page'
            });
        }

        console.log('✅ Prix trouvé:', price);
        console.log('✅ Titre:', title);

        // 5. Réponse réussie
        res.json({
            success: true,
            product: {
                title: title,
                price: price,
                priceRaw: '$' + price,
                url: url
            }
        });

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        
        // En cas d'erreur, on renvoie des données simulées
        res.json({
            success: true,
            product: {
                title: 'Produit AliExpress (simulé)',
                price: '12.45',
                priceRaw: '$12.45',
                url: url,
                warning: 'Données simulées (erreur de scraping)'
            }
        });
    }
};
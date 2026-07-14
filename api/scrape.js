const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;

    if (!url || !url.includes('aliexpress.com')) {
        return res.status(400).json({ success: false, error: 'URL invalide' });
    }

    try {
        // Ta clé ScrapingBee (celle que tu as sur ton tableau de bord)
        const API_KEY = '0J3CUZABWCBP7VH13X15B8U021WCQMLLDP67NZJ0';

        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: API_KEY,
                url: url,
                render_js: 'true',
                wait: 3000
            }
        });

        const html = response.data;
        let price = null;
        let title = 'Produit inconnu';

        // 1. Recherche du prix
        const priceMatch = html.match(/\$(\d+\.\d{2})/);
        if (priceMatch) {
            price = priceMatch[1];
        } else {
            const euroMatch = html.match(/€(\d+\.\d{2})/);
            if (euroMatch) {
                price = euroMatch[1];
            } else {
                const anyPrice = html.match(/(\d+\.\d{2})\s*(?:USD|EUR|\$|€)/);
                if (anyPrice) {
                    price = anyPrice[1];
                }
            }
        }

        // 2. Recherche du titre
        const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) {
            title = titleMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 80);
        }

        if (!price) {
            return res.status(404).json({ success: false, error: 'Prix non trouvé' });
        }

        // Réponse réussie avec le prix réel
        res.json({
            success: true,
            product: {
                title: title || 'Produit AliExpress',
                price: price,
                priceRaw: '$' + price,
                url: url
            }
        });

    } catch (error) {
        console.error('ScrapingBee error:', error.message);
        // En cas d'erreur, on renvoie des données simulées pour que le frontend ne reste pas bloqué
        res.json({
            success: true,
            product: {
                title: 'Produit AliExpress (simulé)',
                price: '12.45',
                priceRaw: '$12.45',
                url: url,
                warning: 'Données simulées (ScrapingBee indisponible)'
            }
        });
    }
};
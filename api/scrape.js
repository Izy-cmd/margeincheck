const axios = require('axios');

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
        const API_KEY = '0J3CUZABWCBP7VH13X15B8U021WCQMLLDP67NZJ0';

        const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
            params: {
                api_key: API_KEY,
                url: url,
                render_js: 'false',
                wait: 2000
            }
        });

        const html = response.data;

        let price = null;
        let title = 'Produit inconnu';

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

        const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (titleMatch) {
            title = titleMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 80);
        }

        if (!price) {
            return res.status(404).json({
                success: false,
                error: 'Impossible de trouver le prix sur cette page.'
            });
        }

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
        console.error('Erreur ScrapingBee:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erreur de scraping: ' + error.message
        });
    }
};
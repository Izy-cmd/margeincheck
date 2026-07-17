const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { url } = req.query;

    if (!url || !url.includes('aliexpress.com')) {
        return res.status(400).json({ success: false, error: 'URL invalide' });
    }

    try {
        // 🔑 Remplace cette clé par la tienne (récupérée sur scraperapi.com)
        const apiKey = 83b8afb56904952cdccd9486619f9064;

        // Appel à ScraperAPI
        const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;
        const response = await axios.get(scraperUrl, { timeout: 30000 });

        const html = response.data;

        // === Extraction du prix via JSON-LD ===
        let price = null;
        let title = 'Produit AliExpress';

        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
        if (jsonLdMatch) {
            try {
                const jsonData = JSON.parse(jsonLdMatch[1]);
                if (jsonData.offers && jsonData.offers.price) {
                    price = jsonData.offers.price.toString();
                } else if (jsonData.price) {
                    price = jsonData.price.toString();
                }
                if (jsonData.name) {
                    title = jsonData.name;
                }
            } catch (e) {}
        }

        // Fallback : regex
        if (!price) {
            const match = html.match(/\$(\d+\.\d{2})/);
            if (match) {
                price = match[1];
            } else {
                const euroMatch = html.match(/€(\d+\.\d{2})/);
                if (euroMatch) {
                    price = euroMatch[1];
                }
            }
        }

        // Titre (fallback)
        if (!title || title === 'Produit AliExpress') {
            const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (titleMatch) {
                title = titleMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 80);
            }
        }

        if (!price) {
            return res.status(404).json({ success: false, error: 'Prix non trouvé' });
        }

        console.log('✅ Prix trouvé:', price);
        console.log('✅ Titre:', title);

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
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
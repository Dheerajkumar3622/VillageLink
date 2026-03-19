import express from 'express';
import { downloadAndBuildGraph } from '../utils/osmDownloader.js';
import Auth from '../auth.js';

const router = express.Router();

/**
 * @route POST /api/osm/download-routing-graph
 * @desc Triggers a download of OSM routing data for a specific Village/Block bounding box
 * @access Admin or System (can be expanded based on need)
 */
router.post('/download-routing-graph', Auth.authenticate, Auth.requireAdmin, async (req, res) => {
  try {
    const { areaId, bbox } = req.body;

    if (!areaId || !bbox) {
      return res.status(400).json({ error: 'areaId and bbox are required' });
    }

    // This will download or return the cached JSON file path
    const filePath = await downloadAndBuildGraph(areaId, bbox);
    const fileName = require('path').basename(filePath);

    res.json({
      success: true,
      message: `Routing graph ready for ${areaId}`,
      downloadUrl: `/routing_data/${fileName}`
    });

  } catch (error) {
    console.error('[OSM Route] Error:', error);
    res.status(500).json({ error: 'Failed to build routing graph', details: error.message });
  }
});

/**
 * Note: The actual JSON file needs to be served statically. 
 * Ensure `app.use('/routing_data', express.static('public/routing_data'));` is in `server.js`
 */

export default router;

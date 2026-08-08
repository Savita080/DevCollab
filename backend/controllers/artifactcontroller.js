import Artifact from '../models/artifact.js';

// Normalize a freeform tag payload (comma-separated string or array) into a
// clean array of trimmed, deduped strings. Mirrors CodeSnippet's tags usage.
function normalizeTags(raw) {
    const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split(',') : []);
    return [...new Set(list.map(t => (t || '').toString().trim().toLowerCase()).filter(Boolean))];
}

// Shared helper: turn a message/task's sanitized attachments array into
// Artifact docs. Called from chat/task controllers right after the parent
// document is created, so a single upload shows up in both places without a
// second client round trip.
export async function createArtifactsFromAttachments({ project, uploader, attachments, tags, source, sourceMessage = null, sourceTask = null }) {
    if (!Array.isArray(attachments) || attachments.length === 0) return [];
    const cleanTags = normalizeTags(tags);
    const docs = attachments.map(a => ({
        project,
        uploader,
        url: a.url,
        key: a.key || '',
        name: a.name || '',
        kind: a.kind === 'file' ? 'file' : 'image',
        mimeType: a.mimeType,
        size: a.size,
        tags: cleanTags,
        source,
        sourceMessage,
        sourceTask,
    }));
    return Artifact.insertMany(docs);
}

export const createArtifact = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { url, key, name, kind, mimeType, size, tags } = req.body;

        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            return res.status(400).json({ message: 'A valid file url is required' });
        }

        const artifact = await Artifact.create({
            project: projectId,
            uploader: req.userId,
            url,
            key: key || '',
            name: name || '',
            kind: kind === 'image' ? 'image' : 'file',
            mimeType,
            size,
            tags: normalizeTags(tags),
            source: 'direct',
        });

        const populated = await Artifact.findById(artifact._id).populate('uploader', 'name avatar');
        res.status(201).json({ message: 'Artifact created', artifact: populated });
    } catch (error) {
        console.error('Error creating artifact:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getProjectArtifacts = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { tag, q } = req.query;

        const filter = { project: projectId };
        if (tag) filter.tags = tag.toString().trim().toLowerCase();
        if (q) {
            const safe = q.toString().trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.name = { $regex: safe, $options: 'i' };
        }

        const artifacts = await Artifact.find(filter)
            .populate('uploader', 'name avatar')
            .sort('-createdAt');
        res.status(200).json({ artifacts });
    } catch (error) {
        console.error('Error fetching artifacts:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Distinct tags already used on this project's artifacts — powers the tag
// picker so users choose from existing tags instead of retyping them.
export const getProjectTags = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tags = await Artifact.distinct('tags', { project: projectId });
        res.status(200).json({ tags: tags.sort() });
    } catch (error) {
        console.error('Error fetching artifact tags:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteArtifact = async (req, res) => {
    try {
        const { id, projectId } = req.params;
        const artifact = await Artifact.findOne({ _id: id, project: projectId });
        if (!artifact) return res.status(404).json({ message: 'Artifact not found' });

        if (artifact.uploader.toString() !== req.userId.toString() && req.projectRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not your artifact' });
        }

        await artifact.deleteOne();
        res.status(200).json({ message: 'Artifact deleted', artifactId: id });
    } catch (error) {
        console.error('Error deleting artifact:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

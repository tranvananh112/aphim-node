const ChatMessage = require('../models/ChatMessage');

// @desc    Save chat message to MongoDB
// @route   POST /api/chat/message
// @access  Private
exports.saveMessage = async (req, res) => {
    try {
        // Kiểm tra ban chat
        if (req.user && req.user.isChatBanned) {
            return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị cấm tham gia chat cộng đồng.' });
        }

        const { text, tab, firebaseId, avatar, frame } = req.body;

        if (!text || !firebaseId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // BẢO MẬT: Bắt buộc lấy chatRole & tên user từ DB (req.user), TUYỆT ĐỐI KHÔNG tin req.body gửi từ F12 Console!
        const verifiedChatRole = (req.user.role === 'admin' || req.user.chatRole === 'admin') ? 'admin' : (req.user.chatRole || 'user');
        const verifiedUserName = req.user.name || req.user.user || req.user.email || 'Thành viên';

        const message = await ChatMessage.create({
            userId: req.user.id,
            user: verifiedUserName,
            avatar: avatar || req.user.avatar || '/apple-touch-icon.png',
            chatRole: verifiedChatRole,
            frame: frame || req.user.equippedFrameClass || '',
            text,
            tab,
            firebaseId
        });

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Get chat history
// @route   GET /api/chat/history/:tab
// @access  Public
exports.getHistory = async (req, res) => {
    try {
        const { tab } = req.params;
        const messages = await ChatMessage.find({ tab: tab || 'general' })
            .sort('-createdAt')
            .limit(100);

        res.json({
            success: true,
            count: messages.length,
            data: messages.reverse()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Delete message
// @route   DELETE /api/chat/:id
// @access  Private (Admin or Owner)
exports.deleteMessage = async (req, res) => {
    try {
        // Find message first
        let message = await ChatMessage.findById(req.params.id);
        if (!message) {
            message = await ChatMessage.findOne({ firebaseId: req.params.id });
        }

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        // Check permissions: Admin (role or chatRole) OR message owner
        const isAdmin = req.user.role === 'admin' || req.user.chatRole === 'admin';
        const isOwner = message.userId && message.userId.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Only admins or message owners can delete messages'
            });
        }

        // Delete the message
        await ChatMessage.findByIdAndDelete(message._id);

        // Broadcast deletion to all clients via Socket.io
        const socketUtil = require('../utils/socket');
        if (socketUtil.isInitialized()) {
            socketUtil.emitEvent('chat:delete', {
                firebaseId: message.firebaseId,
                tab: message.tab
            });
        }

        res.json({
            success: true,
            message: 'Message deleted successfully',
            firebaseId: message.firebaseId
        });
    } catch (err) {
        console.error('Delete Message Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Toggle pin
// @route   PUT /api/chat/pin/:id
// @access  Private (Admin)
exports.togglePin = async (req, res) => {
    try {
        console.log('[Pin] Request from user:', req.user.name, 'Role:', req.user.role, 'ChatRole:', req.user.chatRole);
        console.log('[Pin] Message ID:', req.params.id);

        if (req.user.role !== 'admin' && req.user.chatRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Unauthorized: Admin only' });
        }

        // Find by MongoDB ID or FirebaseId
        let msg = null;

        // Try MongoDB ObjectId first
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            msg = await ChatMessage.findById(req.params.id);
            console.log('[Pin] Found by MongoDB ID:', !!msg);
        }

        // Try FirebaseId if not found
        if (!msg) {
            msg = await ChatMessage.findOne({ firebaseId: req.params.id });
            console.log('[Pin] Found by Firebase ID:', !!msg);
        }

        if (!msg) {
            console.log('[Pin] Message not found in MongoDB. Available messages:', await ChatMessage.countDocuments());
            return res.status(404).json({
                success: false,
                message: 'Message not found in database. Please ensure the message is saved to MongoDB first.'
            });
        }

        console.log('[Pin] Message found:', msg.text.substring(0, 50), 'Tab:', msg.tab, 'Current isPinned:', msg.isPinned);

        const newState = !msg.isPinned;

        if (newState) {
            // Unpin all others in the same tab
            const unpinResult = await ChatMessage.updateMany({ tab: msg.tab }, { isPinned: false });
            console.log('[Pin] Unpinned', unpinResult.modifiedCount, 'messages in tab:', msg.tab);
        }

        msg.isPinned = newState;
        await msg.save();
        console.log('[Pin] Message updated. New isPinned:', msg.isPinned);

        // Broadcast to all clients via Socket.io
        const socketUtil = require('../utils/socket');
        if (socketUtil.isInitialized()) {
            socketUtil.emitEvent('chat:pin', {
                tab: msg.tab,
                message: newState ? {
                    firebaseId: msg.firebaseId,
                    text: msg.text,
                    user: msg.user,
                    id: msg.firebaseId // for compatibility
                } : null
            });
            console.log('[Pin] Broadcast sent via Socket.io');
        }

        res.json({
            success: true,
            isPinned: msg.isPinned,
            message: newState ? 'Message pinned successfully' : 'Message unpinned successfully'
        });
    } catch (err) {
        console.error('[Pin] Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Toggle reaction on a message
// @route   POST /api/chat/reaction
// @access  Private
exports.toggleReaction = async (req, res) => {
    try {
        const { firebaseId, emoji, avatar, name, tab } = req.body;
        const userId = req.user.id;

        let message = await ChatMessage.findOne({ firebaseId });

        if (!message) {
            // Create a placeholder message if it doesn't exist in MongoDB yet
            // This happens if Firestore created it but MongoDB sync hasn't finished
            message = new ChatMessage({
                firebaseId,
                tab: tab || 'general',
                text: '[�ang d?ng b?...]',
                user: 'Kh�ch',
                userId: req.user._id
            });
        }

        // Toggle the reaction
        const uid = req.user._id.toString();
        const reactions = message.reactions || new Map();

        if (!reactions.has(emoji)) {
            reactions.set(emoji, { uids: [], avatars: [], names: [] });
        }

        const reactionData = reactions.get(emoji);
        const idx = reactionData.uids.indexOf(uid);

        if (idx !== -1) {
            // Remove reaction
            reactionData.uids.splice(idx, 1);
            reactionData.avatars.splice(idx, 1);
            if (reactionData.names) reactionData.names.splice(idx, 1);
            if (reactionData.uids.length === 0) {
                reactions.delete(emoji);
            }
        } else {
            // Add reaction
            reactionData.uids.push(uid);
            reactionData.avatars.push(avatar || '');
            if (!reactionData.names) reactionData.names = [];
            reactionData.names.push(name || req.user.user || 'Kh�ch');
        }

        // Critical: Tell Mongoose that the Map has changed
        message.reactions = reactions;
        message.markModified('reactions');
        await message.save();

        // Broadcast to all connected clients for realtime sync
        const socketUtil = require('../utils/socket');
        if (socketUtil.isInitialized()) {
            socketUtil.emitEvent('chat:reaction', {
                firebaseId,
                emoji,
                reactions: Object.fromEntries(message.reactions)
            });
        }

        res.json({
            success: true,
            reactions: Object.fromEntries(message.reactions)
        });
    } catch (error) {
        console.error('Toggle Reaction Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get a map of reactions for all messages in a tab
exports.getReactionsMap = async (req, res) => {
    try {
        const { tab } = req.params;
        const messages = await ChatMessage.find({ tab })
            .select('firebaseId reactions');

        const reactionsMap = {};
        messages.forEach(msg => {
            if (msg.firebaseId && msg.reactions && msg.reactions.size > 0) {
                reactionsMap[msg.firebaseId] = Object.fromEntries(msg.reactions);
            }
        });

        res.json({
            success: true,
            data: reactionsMap
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get pinned message for a tab
// @route   GET /api/chat/pinned/:tab
// @access  Public
exports.getPinned = async (req, res) => {
    try {
        const { tab } = req.params;
        const pinned = await ChatMessage.findOne({ tab: tab || 'general', isPinned: true })
            .sort('-updatedAt');

        res.json({
            success: true,
            data: pinned
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};




// @desc    Clean spam messages (Admin only)
// @route   DELETE /api/chat/clean-spam
exports.cleanSpam = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.chatRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const keywords = ['spam', 'xâm nhập', 'bot@', 'bot đang spam', 'cảnh báo bảo mật', 'test spam'];
        const regexPatterns = keywords.map(kw => new RegExp(kw, 'i'));

        const socketUtil = require('../utils/socket');
        const result = await ChatMessage.deleteMany({
            $or: [
                { text: { $in: regexPatterns } },
                { user: { $in: regexPatterns } }
            ]
        });

        if (socketUtil && socketUtil.emitEvent) {
            socketUtil.emitEvent('chat:clean_spam', { deletedCount: result.deletedCount });
        }

        res.json({
            success: true,
            message: `Đã dọn dẹp thành công ${result.deletedCount} tin nhắn spam.`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

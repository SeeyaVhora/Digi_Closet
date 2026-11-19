const Conversation = require('../models/Conversation');
const ClothingItem = require('../models/ClothingItem');
const SavedOutfit = require('../models/SavedOutfit');
const stylistService = require('../services/stylistService');
const weatherService = require('../services/weatherService');

// POST /api/chat
const sendMessage = async (req, res, next) => {
  try {
    const { message, conversationId, city } = req.body;

    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, owner: req.user._id });
      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found.' });
      }
    } else {
      conversation = await Conversation.create({
        owner: req.user._id,
        title: message.slice(0, 50),
        messages: [],
      });
    }

    const [wardrobeItems, savedOutfits, weather] = await Promise.all([
      ClothingItem.find({ owner: req.user._id }),
      SavedOutfit.find({ owner: req.user._id }).sort({ favorite: -1, createdAt: -1 }).limit(10).populate('clothingItems', 'name'),
      weatherService.getCurrentWeather({ city: city || 'Bengaluru' }),
    ]);

    const reply = await stylistService.chat({
      message,
      history: conversation.messages,
      user: req.user,
      wardrobeItems,
      weather: weather.found ? weather : null,
      savedOutfits: savedOutfits.map((o) => ({
        title: o.title,
        favorite: o.favorite,
        itemNames: o.clothingItems.map((i) => i.name),
      })),
    });

    // Only persist the exchange once Gemini has answered, so a failed call
    // never leaves a dangling user message in the history.
    conversation.messages.push({ role: 'user', content: message });
    conversation.messages.push({ role: 'assistant', content: reply });
    await conversation.save();

    res.json({ success: true, data: { conversationId: conversation._id, reply } });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/conversations
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ owner: req.user._id }, { messages: 0 }).sort({ updatedAt: -1 });
    res.json({ success: true, data: { conversations, count: conversations.length } });
  } catch (error) {
    next(error);
  }
};

// GET /api/chat/conversations/:id
const getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, owner: req.user._id });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }
    res.json({ success: true, data: { conversation } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/chat/conversations — clear all chat history
const clearConversations = async (req, res, next) => {
  try {
    const { deletedCount } = await Conversation.deleteMany({ owner: req.user._id });
    res.json({ success: true, message: 'Chat history cleared.', data: { deletedCount } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/chat/conversations/:id
const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, owner: req.user._id });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }
    await conversation.deleteOne();
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendMessage, getConversations, getConversation, deleteConversation, clearConversations };

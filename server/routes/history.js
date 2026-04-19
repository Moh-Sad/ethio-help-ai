import express from "express";
import ChatSession from "../models/ChatSession.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const sessions = await ChatSession.find({ userId: req.user._id })
      .select("-messages")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const formatted = sessions.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    res.json({ sessions: formatted });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { title } = req.body;

    const session = await ChatSession.create({
      userId: req.user._id,
      title: title || "New Chat",
      messages: [],
    });

    res.status(201).json({
      session: {
        id: session._id.toString(),
        title: session.title,
        messages: [],
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    res.json({
      session: {
        id: session._id.toString(),
        title: session.title,
        messages: session.messages.map((m) => ({
          id: m._id.toString(),
          role: m.role,
          text: m.text,
          createdAt: m.createdAt,
        })),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await ChatSession.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Session not found." });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/messages", async (req, res, next) => {
  try {
    const { role, text } = req.body;

    if (!role || !text) {
      return res.status(400).json({ error: "Role and text are required." });
    }

    if (!["user", "assistant"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'user' or 'assistant'." });
    }

    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        $push: { messages: { role, text } },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found." });
    }

    const lastMessage = session.messages[session.messages.length - 1];

    if (session.messages.length === 1 && role === "user") {
      session.title = text.length > 50 ? `${text.slice(0, 50)}...` : text;
      await session.save();
    }

    res.status(201).json({
      message: {
        id: lastMessage._id.toString(),
        role: lastMessage.role,
        text: lastMessage.text,
        createdAt: lastMessage.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { runAgent } from '../services/chatService.js';
import * as conversationModel from '../models/conversation.js'
import * as stepModel from "../models/step.js";
import type { StepRecord } from "../types/index.js";

const router = Router();

router.post('/send', chatLimiter, async (req: Request, res: Response) => {
  const { message,conversationId } = req.body;
  if (!message || typeof message !== 'string') {
    res.write(
      `data:${JSON.stringify({ type: "error", message: '请输入名称' })}\n\n`,
    );
  }
  
  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
    //插入user信息 
    try{
      await conversationModel.addMessage(conversationId,{
        role:'user',
        content:message
      })
    }catch(err:any){
      res.write(
        `data:${JSON.stringify({ type: "error", message: err.message })}\n\n`,
      );
    }

  console.log(`[CHAT] ${message.slice(0, 50)}...`);

  try {
    // 先用一个step数组去存 agent的工具调用
    const stepRecodes:StepRecord[]=[]
    let fullContent=''
    for await(let stream of runAgent(message)){
      res.write(`data:${JSON.stringify(stream)}\n\n`)
      if(stream.type==='content'){
        fullContent+=stream.content
      }
      if(stream.type==='tool_step'){
        stepRecodes.push(stream.step)
      }
    }
    // 写入agentmessage
    if(fullContent){
      const agentmsg=await conversationModel.addMessage(conversationId,{
        role:'agent',
        content:fullContent
      })
      if(agentmsg){
        // 写入工具调用 
        await stepModel.batchInsertSteps(agentmsg.id,stepRecodes)
      }
    }
    res.end();
  } catch (err: any) {
    // SSE 头已发出，只能用流格式报错
    res.write(
      `data:${JSON.stringify({ type: 'error', message: err.message })}\n\n`,
    );
    res.end();
  }
});

export default router;

# -*- coding: utf-8 -*-
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from dotenv import load_dotenv
import os
import sys
from pathlib import Path


ENV_PATH = Path(__file__).resolve().with_name(".env")
load_dotenv(ENV_PATH)

# Get HuggingFace API token
hf_token = os.getenv('HUGGINGFACE_API_TOKEN')

# Initialize HuggingFace LLM


llm_endpoint = HuggingFaceEndpoint(
    repo_id=os.getenv('REPO_ID'),
    temperature=0.7,
    huggingfacehub_api_token=hf_token,
    max_new_tokens=512
)

# Wrap with ChatHuggingFace
llm = ChatHuggingFace(llm=llm_endpoint)

# Create prompt template with chat history
template = """You are a helpful AI assistant. Answer the user's question based on the conversation history.

Chat History:
{chat_history}

Current Question: {question}

Answer:"""

prompt = ChatPromptTemplate.from_template(template)

# Create output parserrepo_id = "moonshotai/Kimi-K2.5"
output_parser = StrOutputParser()

# Create chain
llm_chain = prompt | llm | output_parser

# Chat history buffer
chat_history = []

def generate_response_with_memory(query):
    """Generate response with conversation memory"""
    # Format chat history as string
    history_text = ""
    for msg in chat_history:
        if isinstance(msg, HumanMessage):
            history_text += f"User: {msg.content}\n"
        elif isinstance(msg, AIMessage):
            history_text += f"Assistant: {msg.content}\n"
    
    # Generate response
    response = llm_chain.invoke({
        "chat_history": history_text,
        "question": query
    })
    
    # Add to chat history
    chat_history.append(HumanMessage(content=query))
    chat_history.append(AIMessage(content=response))
    
    return response

# Simple chatbot
if __name__ == "__main__":
    print("=" * 70)
    print("🤖 Chatbot with Memory Ready! Type 'quit' to exit.")
    print("=" * 70)
    print()
    
    while True:
        try:
            user_input = input("\033[1mYou >>\033[0m ")
        except (EOFError, KeyboardInterrupt):
            print("\n\033[1mChatbot >>\033[0m Goodbye!")
            break
        
        if user_input.lower() in ['quit', 'exit', 'bye']:
            chat_history = []
            print("\033[1mChatbot >>\033[0m Thank you for chatting! Have a great day!")
            break
        
        if not user_input.strip():
            continue
        
        try:
            response = generate_response_with_memory(user_input)
            print(f"\033[1mChatbot >>\033[0m {response}\n")
                
        except Exception as e:
            print(f"\033[1mError >>\033[0m {e}\n")

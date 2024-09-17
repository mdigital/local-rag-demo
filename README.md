# Local RAG with Ollama

This project demonstrates how to build a local Retrieval Augmented Generation (RAG) system using Ollama. Ollama is an open-source AI model host that can be used for a variety of tasks, including text generation and creating embeddings.

This code is for experimentation, if it doesn't work for you - reach out! It might just be a misconfiguration on my part.

robin@mdigital.co.nz

## Overview

This project is designed to be a simple and efficient way to build a local RAG system. It uses Ollama as the language model host and a local postgres database with pgvectorfor storing and querying the documents.

## Setup Postgres with pgvector

```docker pull pgvector/pgvector:pg16

docker volume create pgvector-data

docker run --name pgvector-container -e POSTGRES_PASSWORD=password \
 -p 5432:5432 -v pgvector-data:/var/lib/postgresql/data \
 -d pgvector/pgvector:pg16

docker exec -it pgvector-container psql -U postgres
```

## Create a table for storing documents

Note - if you use llama3.1 for embeddings, you'll need 4096 dimensions, if you use minilm just 384 are needed.

```
postgres=# CREATE DATABASE localrag;
CREATE DATABASE

postgres=# \c localrag
You are now connected to database "localrag" as user "postgres".

localrag=# CREATE EXTENSION vector;
CREATE EXTENSION

localrag=# CREATE TABLE items (id bigserial PRIMARY KEY, chunk text, embedding vector(4096));
CREATE TABLE
```

## Setup Ollama

Download and run Ollama from the [official website](https://ollama.com/download).

On the command line install some models and run ollama serve to fire up the API.

```
ollama pull llama3.1
ollama serve
```

## Running the code

To load the data:

`node chunk.js`

To run the chat:

`node chat.js`

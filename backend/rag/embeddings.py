from google import genai
from langchain_core.embeddings import Embeddings

from tenacity import retry
from tenacity import stop_after_attempt
from tenacity import wait_exponential

class GeminiEmbeddings(Embeddings):

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def _embed(self, text: str):
        response = self.client.models.embed_content(
            model="gemini-embedding-2",
            contents=text
        )

        return response.embeddings[0].values

    def embed_documents(self, texts):
        embeddings = []

        for text in texts:
            embeddings.append(self._embed(text))

        return embeddings

    def embed_query(self, text):
        return self._embed(text)

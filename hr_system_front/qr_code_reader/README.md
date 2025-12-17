# Leitor de QR Code para Controle de Acesso aos Ônibus (Sistema de Gerenciamento de Funcionários - RH)

Este é um script standalone em Python que utiliza uma webcam para ler QR Codes de matrículas de funcionários em tempo real e registrar o acesso a um ônibus em um arquivo de log local. USADO PARA TESTES DE DECODIFICAÇÃO E ARMAZENAMENTO DOS DADOS NO FORMATO DA TABELA DO BANCO DE DADOS.

## ✨ Funcionalidades

* **Detecção em Tempo Real:** Usa a biblioteca OpenCV para capturar vídeo da webcam e identificar QR Codes.
* **Registro de Acesso:** Salva cada leitura válida em um arquivo `.csv` diário e específico para cada ônibus.
* **Controle de Duplicatas (Cooldown):** Impede que a mesma matrícula seja registrada várias vezes em um curto intervalo de tempo (configurável).
* **Feedback Visual:** Exibe na tela da câmera uma caixa colorida em torno do QR Code lido, e uma mensagem de status para cada leitura (Sucesso, Já Registrado, Falha).
* **Pré-carregamento:** Carrega os logs do dia ao iniciar para manter a consistência do cooldown mesmo após reinicializações.

## 🚀 Tecnologias Utilizadas

* Python 3
* OpenCV (`opencv-python`)
* Pyzbar (`pyzbar`)
* Tkinter (para a caixa de diálogo inicial)
* Numpy

## ⚙️ Configuração e Instalação

### Pré-requisitos

* Python 3.8 ou superior
* `pip` (gerenciador de pacotes do Python)
* Uma webcam conectada e funcionando.

### Passos

1.  **Navegue até a pasta do projeto:**
    ```bash
    cd qr_code_reader
    ```

2.  **(Opcional mas recomendado) Crie e ative um ambiente virtual.**

3.  **Instale as dependências:**
    ```bash
    pip install -r requirements.txt
    ```
    *Nota: `pyzbar` pode exigir a instalação de bibliotecas de sistema adicionais. Consulte a documentação da `pyzbar` para o seu sistema operacional se encontrar problemas.*

### Configuração no Código

Algumas variáveis no topo do arquivo `reader.py` podem ser ajustadas:
* `waiting_time_registration`: Tempo de espera (em minutos) para registrar a mesma matrícula novamente.
* `LOG_DIRECTORY`: Nome da pasta onde os arquivos `.csv` serão salvos.

## ▶️ Como Executar o Leitor

1.  Com o ambiente ativado e as dependências instaladas, execute o script no terminal:
    ```bash
    python reader.py
    ```

2.  Uma caixa de diálogo aparecerá pedindo o **número do ônibus**. Digite o número e clique em "OK".

3.  A janela da câmera será aberta, e o leitor começará a procurar por QR Codes.

4.  Para encerrar o programa, foque na janela da câmera e pressione a tecla **'q'**.

## 📄 Arquivos Gerados

O script cria e gerencia arquivos de log dentro da pasta `bus_access_logs`. Cada arquivo é nomeado com o número do ônibus e a data atual, no formato `bus_access<NUMERO>_<AAAA-MM-DD>.csv`.
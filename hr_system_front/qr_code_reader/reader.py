#====================================================================================
# Script standalone para leitura de QR Codes em tempo real via webcam.
# Este programa captura vídeo, detecta QR Codes contendo matrículas de funcionários,
# e registra o acesso em um arquivo .csv local, controlando duplicatas em um
# intervalo de tempo definido.
#====================================================================================

from pyzbar.pyzbar import decode, ZBarSymbol
from tkinter import messagebox, simpledialog
from datetime import datetime, timezone

import cv2
import tkinter as tk
import time
import csv
import os
import numpy as np


# --- Variáveis de Estado Globais ---
last_log_times = {}
ultimo_qrcode_processado = {"dados": None, "tempo": 0}
feedback_message = ""
feedback_timestamp = 0
feedback_color = (0, 0, 0)
waiting_time_registration = 1 # Tempo de espera para registro (em minutos)

# --- Configurações ---
LOG_COOLDOWN_SEGUNDOS = waiting_time_registration * 60
FEEDBACK_DURATION_SEGUNDOS = 2
VISUAL_COOLDOWN_SEGUNDOS = 3
LOG_DIRECTORY = "bus_access_logs" 

# Carrega os registros de um arquivo de log CSV existente para a memória.
# Utilizada em:
# - 'qr_code_reader/reader.py': Chamada uma vez no início da função 'main'.
def preload_last_log_times(filename: str) -> dict:
    """
    Lê um arquivo CSV de log para pré-carregar os últimos horários de acesso
    de cada matrícula, evitando registros duplicados após uma reinicialização
    do script no mesmo dia.

    Args:
        filename (str): O caminho para o arquivo .csv de log.

    Returns:
        dict: Um dicionário mapeando cada matrícula ao seu último timestamp de acesso.
    """
    times = {}
    try:
        if os.path.exists(filename):
            print(f"Carregando registros anteriores de '{filename}'...")
            with open(filename, mode='r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader)
                col_map = {name: i for i, name in enumerate(header)}
                for row in reader:
                    if len(row) > max(col_map.values(), default=-1):
                        matricula = row[col_map['matricula']]
                        date_str = row[col_map['date']]
                        time_str = row[col_map['time']]
                        dt_obj = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
                        timestamp_float = dt_obj.timestamp()
                        if matricula not in times or timestamp_float > times[matricula]:
                            times[matricula] = timestamp_float
                    else:
                        print(f"AVISO: Linha ignorada no CSV por formato inválido: {row}")
            print(f"{len(times)} matrículas pré-carregadas para o cooldown.")
    except Exception as e:
        print(f"AVISO: Não foi possível pré-carregar os registros do arquivo. Erro: {e}")
    return times

# Função principal que executa o leitor de QR Code.
# Utilizada em:
# - 'qr_code_reader/reader.py': Chamada quando o script é executado diretamente.
def main():
    """
    Inicializa a aplicação do leitor: pede o número do ônibus, configura
    o arquivo de log, abre a câmera e entra no loop de detecção e registro.
    """
    global feedback_message, feedback_timestamp, feedback_color, last_log_times, ultimo_qrcode_processado
    root = tk.Tk()
    root.withdraw()
    bus_number = simpledialog.askinteger("Identificacao do Onibus", "Por favor, digite o numero do onibus:", parent=root)
    root.destroy()
    if bus_number is None:
        print("Operacao cancelada.")
        return
    if not os.path.exists(LOG_DIRECTORY):
        os.makedirs(LOG_DIRECTORY)
    date_str_filename = datetime.now().strftime("%Y-%m-%d")
    log_filename = os.path.join(LOG_DIRECTORY, f"bus_access{bus_number}_{date_str_filename}.csv")
    file_exists = os.path.exists(log_filename)
    last_log_times = preload_last_log_times(log_filename)

    try:
        with open(log_filename, mode='a', newline='', encoding='utf-8') as log_file:
            csv_writer = csv.writer(log_file)
            if not file_exists:
                csv_writer.writerow(['date', 'time', 'matricula', 'bus_number'])
            
            print(f"Leitor iniciado para o ônibus #{bus_number}.")
            print(f"Registros de acesso serão salvos em: '{log_filename}'")
            print("Pressione 'Q' na janela da câmera para sair.")

            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if not cap.isOpened():
                messagebox.showerror("Erro de Câmera", "Não foi possível abrir a câmera.")
                return

            while True:
                success, frame = cap.read()
                if not success:
                    break
                if feedback_message and (time.time() - feedback_timestamp > FEEDBACK_DURATION_SEGUNDOS):
                    feedback_message = ""
                
                qrcodes_encontrados = decode(frame, symbols=[ZBarSymbol.QRCODE])
                rectangles_to_draw = []

                for qrcode in qrcodes_encontrados:
                    matricula_decodificada = qrcode.data.decode('utf-8')
                    tempo_atual = time.time()
                    
                    if (matricula_decodificada == ultimo_qrcode_processado["dados"] and 
                        (tempo_atual - ultimo_qrcode_processado["tempo"]) < VISUAL_COOLDOWN_SEGUNDOS):
                        rectangles_to_draw.append((qrcode.polygon, feedback_color))
                        continue 
                    
                    ultimo_qrcode_processado["dados"] = matricula_decodificada
                    ultimo_qrcode_processado["tempo"] = tempo_atual
                    current_feedback_color = (0, 0, 0)
                    
                    try:
                        int(matricula_decodificada)
                        last_time_logged = last_log_times.get(matricula_decodificada)
                        if last_time_logged and (tempo_atual - last_time_logged < LOG_COOLDOWN_SEGUNDOS):
                            feedback_message = f"JA REGISTRADO: {matricula_decodificada}"
                            current_feedback_color = (0, 255, 255) # Amarelo
                            feedback_timestamp = tempo_atual
                        else:
                            now_local = datetime.now()
                            date_str_data = now_local.strftime('%Y-%m-%d')
                            time_str_data = now_local.strftime('%H:%M:%S')
                            csv_writer.writerow([date_str_data, time_str_data, matricula_decodificada, bus_number])
                            log_file.flush()
                            last_log_times[matricula_decodificada] = tempo_atual
                            print(f"Acesso registrado: Matrícula {matricula_decodificada}, Ônibus {bus_number}")
                            feedback_message = f"SUCESSO: {matricula_decodificada}"
                            current_feedback_color = (0, 255, 0) # Verde
                            feedback_timestamp = tempo_atual
                    except ValueError:
                        print(f"AVISO: QR Code com conteúdo inválido ignorado: '{matricula_decodificada}'")
                        feedback_message = "FALHA: Leitura Invalida"
                        current_feedback_color = (0, 0, 255) # Vermelho
                        feedback_timestamp = tempo_atual
                    
                    feedback_color = current_feedback_color # Atualiza a cor global para o próximo frame
                    rectangles_to_draw.append((qrcode.polygon, current_feedback_color))
                
                for polygon_points, color in rectangles_to_draw:
                    # Converte os pontos para um array NumPy do tipo int32
                    pts = np.array([[p.x, p.y] for p in polygon_points], dtype=np.int32)
                    # Passa o array dentro de uma lista para a função
                    cv2.polylines(frame, [pts], True, color, 3)
                
                if feedback_message:
                    cv2.putText(frame, feedback_message, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 
                                1.2, feedback_color, 2, cv2.LINE_AA)
                cv2.imshow(f"Leitor de Acesso - Onibus #{bus_number} (Pressione 'q' para sair)", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
    except IOError as e:
        messagebox.showerror("Erro de Arquivo", f"Não foi possível criar ou escrever no arquivo de log.\nDetalhes: {e}")
    finally:
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        cv2.destroyAllWindows()
        print(f"\nEncerrando o programa. Verifique os dados no arquivo '{log_filename}'.")

# Ponto de entrada do script.
# Garante que a função 'main()' seja executada apenas quando o arquivo é
# rodado como um script principal, e não quando é importado.
if __name__ == "__main__":
    main()
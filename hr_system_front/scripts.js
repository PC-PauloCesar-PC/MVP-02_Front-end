// ==========================================================================
// CONFIGURAÇÕES GLOBAIS
// ==========================================================================
const API_BASE_URL = 'http://127.0.0.1:5000';
const ROWS_PER_PAGE = 10; // Defina quantos itens aparecerão por página nas tabelas

// Variáveis de estado para paginação
let completeEmployeeList = [];
let currentEmployeePage = 1;
let totalEmployeePages = 1;

let completeBusAccessList = [];
let currentBusAccessPage = 1;
let totalBusAccessPages = 1;

// Variável para guardar a URL do objeto de PDF atual
let currentObjectUrl = null; 

//Constante que define o ID da view principal da aplicação.
const MAIN_VIEW_ID = 'mainPageForm';

// Variáveis globais para armazenar as instâncias dos gráficos (para poder destruir e recriar)
let sectorChartInstance = null;
let statusChartInstance = null;
let busHourlyChartInstance = null;

// Configurações Auth0
let auth0Client = null;
const auth0Config = {
    domain: "dev-t2t22j624bniadzk.us.auth0.com",
    clientId: "rymxMljoL3lKTHKva7xzejdyEybh6vUO",
    authorizationParams: {
        redirect_uri: "http://127.0.0.1:3000",
        audience: "https://rh-system-api"
    }
};

// Inicialização
window.onload = async () => {
    await configureAuth0();
    //showView(MAIN_VIEW_ID);
};

async function configureAuth0() {
    auth0Client = await auth0.createAuth0Client(auth0Config);

    // Verifica se está voltando do login (callback)
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
    }

    await updateUI();
}

async function updateUI() {
    const isAuthenticated = await auth0Client.isAuthenticated();

    // Seleciona os elementos
    const loginBtn = document.getElementById("btnLogin");
    const logoutBtn = document.getElementById("btnLogout");
    const mainContainer = document.querySelector(".mainSectionContainer");

    if (isAuthenticated) {
        // Usuário Logado:
        // Mostra botão de Sair, Esconde botão de Entrar
        loginBtn.classList.add("hidden");
        logoutBtn.classList.remove("hidden");

        // REVELA A APLICAÇÃO
        mainContainer.classList.remove("hidden");

        // Garante que está na view correta, ou seja, se todas as views estiverem escondidas, mostra a principal
        if (document.getElementById('mainPageForm').classList.contains('hidden') && 
            document.getElementById('newEmployeeForm').classList.contains('hidden') &&
            document.getElementById('updateEmployeeForm').classList.contains('hidden') &&
            document.getElementById('searchEmployeeForm').classList.contains('hidden') &&
            document.getElementById('employeeQRCodeForm').classList.contains('hidden') &&
            document.getElementById('employeeNotesForm').classList.contains('hidden') &&
            document.getElementById('busAccessForm').classList.contains('hidden') &&
            document.getElementById('deleteEmployeeForm').classList.contains('hidden') &&
            document.getElementById('employmentContractDataForm').classList.contains('hidden')) {
             showView(MAIN_VIEW_ID);
        }

    } else {
        // Usuário NÃO Logado:
        // Mostra botão de Entrar, Esconde botão de Sair
        loginBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");

        // ESCONDE A APLICAÇÃO
        mainContainer.classList.add("hidden");
    }
}

async function login() {
    await auth0Client.loginWithRedirect();
}

async function logout() {
    await auth0Client.logout({
        logoutParams: {
            returnTo: window.location.origin
        }
    });
}

// FUNÇÃO AUXILIAR PARA FETCH COM TOKEN
async function fetchWithAuth(url, options = {}) {
    let token;
    
    // Tenta obter o Token do Auth0
    try {
        token = await auth0Client.getTokenSilently();
    } catch (error) {
        console.error("Erro:", error);
        // Se falhar aqui, é porque o usuário não está logado no Front
        alert("Sessão inválida ou expirada. Por favor, faça login novamente.");
        login();
        return null;
    }

    // Adiciona o header
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    // Tenta conectar ao Backend
    try {
        const response = await fetch(url, { ...options, headers });
        
        // Verifica se o Backend recusou o token
        if (response.status === 401) {
            alert("O servidor recusou sua credencial (Token expirado ou inválido). Faça login novamente.");
            login(); 
            return null;
        }
        
        // Retorna a resposta para ser processada pelas outras funções (que tratam 404, 500, etc)
        return response;

    } catch (networkError) {
        // Se cair aqui, é erro de conexão.
        console.error("Erro de Rede:", networkError);
        alert("ERRO DE CONEXÃO: Não foi possível comunicar com o servidor/banco de dados.");
        return null;
    }
}




// ==========================================================================
// CONTROLE DE NAVEGAÇÃO E VISUALIZAÇÃO (VIEWS)
// ==========================================================================
/**
 * Função principal para alternar entre as "páginas" (seções/formulários).
 * @param {string} viewIdToShow O ID do elemento que deve ser mostrado.
 * Utilizada em: Todas as funções de navegação de página.
 */
function showView(viewIdToShow) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });
    const viewToShow = document.getElementById(viewIdToShow);
    if (viewToShow) {
        viewToShow.classList.remove('hidden');
    } else {
        console.error(`A seção com o ID '${viewIdToShow}' não foi encontrada.`);
    }
}

/**
 * Retorna o usuário para a página principal (menu).
 * Utilizada em: Botões "Cancelar".
 */
function cancelAction() {
    console.log("Ação cancelada, retornando para a página principal.");
    showView(MAIN_VIEW_ID);
}

/**
 * Funções chamadas pelos botões na página principal para navegar para outras telas.
 * Cada uma chama showView com o ID da tela de destino.
 */
function newEmployeePage() {
    showView('newEmployeeForm');
}

function updateEmployeePage() {
    showView('updateEmployeeForm');
}

function searchEmployeePage() {
    showView('searchEmployeeForm');
}

function qrCodeEmployeePage() {
    showView('employeeQRCodeForm');
}

function notesEmplyeePage() {
    showView('employeeNotesForm');
}

function busAccessPage() {
    showView('busAccessForm');
}

function deleteEmployeePage() {
    showView('deleteEmployeeForm');
}

function generateEmploymentContract() {
    showView('employmentContractDataForm'); 
}
/**
 * Garante que a página principal seja exibida assim que o DOM do site carregar.
 * Utilizada em: Evento 'DOMContentLoaded' do documento.
 */
document.addEventListener('DOMContentLoaded', () => {
    showView(MAIN_VIEW_ID);
});

/**
 * Função genérica para limpar os campos de qualquer formulário.
 * @param {string} formId O ID do formulário a ser limpo.
 */
function clearForm(formId) {
    document.getElementById(formId).reset();
}

/**
 * =========================================================================
 * FUNCIONALIDADE BUSCA DE CEP (API EXTERNA)
 * =========================================================================
 */

/**
 * Mapeia os IDs dos campos de endereço de um formulário.
 * @typedef {object} AddressFieldIDs
 * @property {string} rua
 * @property {string} bairro
 * @property {string} cidade 
 * @property {string} uf
 */

/**
 * -------------------------------------------------------------------------
 * Preenche os campos de endereço com base nos IDs e nos dados da API.
 * -------------------------------------------------------------------------
 * @param {object} data - O objeto de dados retornado pela API ViaCEP.
 * @param {AddressFieldIDs} fieldIds - Um objeto mapeando os IDs dos campos.
 */
function fillAddressFields(data, fieldIds) {
    // Pega os elementos
    const ruaElement = document.getElementById(fieldIds.rua);
    const bairroElement = document.getElementById(fieldIds.bairro);
    const cidadeElement = document.getElementById(fieldIds.cidade);
    const ufElement = document.getElementById(fieldIds.uf);

    // Só atualiza os campos se a API retornar um valor.
    // Isso evita que a API apague um valor que o usuário digitou manualmente.

    // Se a API retornar um nome de rua, E o campo de rua estiver vazio, preencha.
    // Ou, se a API retornar um nome de rua, sobrescreve o que estiver lá:
    if (data.logradouro) {
        ruaElement.value = data.logradouro;
    }
    // O mesmo para o bairro
    if (data.bairro) {
        bairroElement.value = data.bairro;
    }
    // Cidade e UF são quase sempre preenchidos
    if (data.localidade) {
        cidadeElement.value = data.localidade;
    }
    if (data.uf) {
        ufElement.value = data.uf;
    }
    
}

/**
 * -------------------------------------------------------------------------
 * Busca o CEP e retorna os dados
 * -------------------------------------------------------------------------
 * @param {string} cepValue O valor do CEP.
 * @returns {Promise<object|null>} Um objeto com os dados do endereço ou null se não for encontrado/inválido.
 */
const fetchCepData = async (cepValue) => {
    
    // VERIFICAÇÃO DE CAMPO VAZIO
    // Se o campo estiver vazio, não faz nada, para o caso do usuário não souber o CEP de imediato e estiver usando TAB para a navegação entre os campsos.
    if (!cepValue) {
        return null;
    }

    // VERIFICAÇÃO DE "NÃO-NÚMERO"
    // Testa se a string contém qualquer coisa que não seja um dígito (\d).
    if (/\D/.test(cepValue)) { 
        alert('O CEP deve conter apenas números.');
        return null;
    }

    // VERIFICAÇÃO DE COMPRIMENTO (redundância - mesmo que o campo HTML já tenha maxlength - para o caso do usuário digitar menos de 8 números)
    if (cepValue.length !== 8) {
        alert('O CEP deve conter 8 números.');
        return null;
    }

    // BUSCA NA API VIA CEP
    const cep = cepValue;
    const url = `https://viacep.com.br/ws/${cep}/json/`;

    try {
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) {
            throw new Error('Erro ao buscar o CEP.');
        }

        const data = await response.json();

        if (data.erro) {
            alert('CEP não encontrado. Por favor, verifique o número digitado.');
            return null;
        }
        
        return data; 

    } catch (error) {
        console.error('Falha na API do ViaCEP:', error);
        alert('Não foi possível buscar o CEP. Verifique sua conexão ou tente mais tarde.');
        return null;
    }
};

/**
 * -------------------------------------------------------------------------
 * OS "HANDLERS" (Manipuladores)
 * Funções pequenas que "conectam" o HTML às funções universais.
 * -------------------------------------------------------------------------
 */

/**
 * Handler para a busca de CEP no formulário de novo funcionário.
 */
const handleNewEmployeeCep = async (cepValue) => {
    // Define o mapeamento de IDs para ESTE formulário
    const fieldIds = {
        rua: 'newRua',
        bairro: 'newBairro',
        cidade: 'newCidade',
        uf: 'newUF'
    };

    // Busca os dados
    const data = await fetchCepData(cepValue);

    // Preenche (se os dados existirem)
    if (data) {
        fillAddressFields(data, fieldIds);
    }
    // Se 'data' for null (CEP inválido), não faz nada.
    // Isso preserva qualquer dado digitado manualmente.
};

/**
 * Handler para a busca de CEP no formulário de atualização de funcionário.
 */
const handleUpdateEmployeeCep = async (cepValue) => {
    // Define o mapeamento de IDs para ESTE formulário
    const fieldIds = {
        rua: 'updateRua',
        bairro: 'updateBairro',
        cidade: 'updateCidade',
        uf: 'updateUF'
    };

    // Busca os dados
    const data = await fetchCepData(cepValue);

    // Preenche (se os dados existirem)
    if (data) {
        fillAddressFields(data, fieldIds);
    }
};



/**
 * Handler para a busca de CEP no formulário de contrato (Dados da Empresa).
 */
const handleContractCompanyCep = async (cepValue) => {
    // Mapeamento de IDs para os campos da EMPRESA
    const fieldIds = {
        rua: 'contractRua',
        bairro: 'contractBairro',
        cidade: 'contractCidade',
        uf: 'contractUF'
    };

    // Busca os dados
    const data = await fetchCepData(cepValue);

    // Preenche (se os dados existirem)
    if (data) {
        fillAddressFields(data, fieldIds);

    }
};

/**
 * Handler para a busca de CEP no formulário de contrato (Dados do Funcionário).
 */
const handleContractEmployeeCep = async (cepValue) => {
    // Mapeamento de IDs para os campos do FUNCIONÁRIO
    const fieldIds = {
        rua: 'contractFuncionarioRua',
        bairro: 'contractFuncionarioBairro',
        cidade: 'contractFuncionarioCidade',
        uf: 'contractFuncionarioUF'
    };

    // Busca os dados
    const data = await fetchCepData(cepValue);

    // Preenche (se os dados existirem)
    if (data) {
        fillAddressFields(data, fieldIds);

    }
};



// ==========================================================================
// FUNCIONALIDADES DE FUNCIONÁRIO (CRUD)
// ==========================================================================

/**
 * Coleta os dados do formulário do novo funcionário e os envia para a API via POST.
 * Utilizada em: 'index.html', no 'onclick' do botão "Salvar" do formulário 'newEmployeeForm'.
 */
const addNewEmployee = async () => {
    const nome = document.getElementById('newNome').value;
    const cpf = document.getElementById('newCPF').value;
    const identidade = document.getElementById('newIdentidade').value;
    const dataNascimento = document.getElementById('newDataNascimento').value;
    const genero = document.getElementById('newGenero').value;
    const cep = document.getElementById('newCEP').value;
    const rua = document.getElementById('newRua').value;
    const numero = document.getElementById('newNumero').value;
    const bairro = document.getElementById('newBairro').value;
    const cidade = document.getElementById('newCidade').value;
    const uf = document.getElementById('newUF').value;
    const complemento = document.getElementById('newComplemento').value;

    // Formata o endereço em uma string única para o backend
    // Ex: "Rua das Flores, 123, Apto 4, Jardim - São Paulo/SP - CEP: 12345-678"
    const enderecoFormatado = `${rua}, ${numero}` +
                           `${complemento ? ', ' + complemento : ''}` +
                           `, ${bairro} - ${cidade}/${uf}` +
                           ` - CEP: ${cep}`;

    const telPrincipal = document.getElementById('newTelPrincipal').value;
    const telSecundario = document.getElementById('newTelSecundario').value;
    const email = document.getElementById('newEmail').value;
    const cargo = document.getElementById('newCargo').value;
    const salario = document.getElementById('newSalario').value;
    const centroCusto = document.getElementById('newCentroCusto').value;
    const setor = document.getElementById('newSetor').value;
    const matriculaSuperior = document.getElementById('newMatriculaSuperior').value;
    const nomeSuperior = document.getElementById('newNomeSuperior').value;
    const dataAdmissao = document.getElementById('newDataAdmissao').value;
    const dataDemissao = document.getElementById('newDataDemissao').value;
    const status = document.getElementById('newStatus').value;
    const firstNote = document.getElementById('newNote').value; 

    // Validação simples
    if (!nome || !cpf || !identidade || !dataNascimento || !genero || !cep || !rua || !numero || !bairro || !cidade || !uf || !telPrincipal || !cargo || !salario || !centroCusto || !setor || !matriculaSuperior || !nomeSuperior || !dataAdmissao || !status) {
        alert("Por favor, preencha todos os campos obrigatórios marcados com *");
        return;
    }

    const formData = new FormData();
    formData.append('nome', nome);
    formData.append('cpf', cpf);
    formData.append('identidade', identidade);
    formData.append('data_nascimento', dataNascimento);
    formData.append('genero', genero);
    formData.append('endereco', enderecoFormatado);
    formData.append('tel_principal', telPrincipal);
    formData.append('tel_secundario', telSecundario);
    formData.append('email', email);
    formData.append('cargo', cargo);
    formData.append('salario', salario);
    formData.append('centro_custo', centroCusto);
    formData.append('setor', setor);
    formData.append('matricula_superior', matriculaSuperior);
    formData.append('nome_superior', nomeSuperior);
    formData.append('data_admissao', dataAdmissao);
    formData.append('data_demissao', dataDemissao);
    formData.append('status', status);
    formData.append('first_note_text', firstNote);

    const url = `${API_BASE_URL}/employee`;
    try {
        const response = await fetchWithAuth(url, {
            method: 'POST',
            body: formData,
        });


        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const result = await response.json();

        if (response.ok) {
            alert(`Funcionário cadastrado com sucesso!\nNome: ${result.nome}\nMatrícula: ${result.matricula}`);
            clearForm('newEmployeeForm');
        } else {
            alert(`Erro ao cadastrar funcionário: ${result.mesage || 'Ocorreu um erro desconhecido.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};

/**
 * Coleta os dados do formulário (apenas os campos preenchidos) de atualização e os envia para a API via PUT.
 * Utilizada em: 'index.html', no 'onclick' do botão "Salvar" do formulário 'updateEmployeeForm'.
 */
const updateEmployee = async () => {
    const matricula = document.getElementById('updateMatricula').value;
    if (!matricula) {
        alert('Por favor, informe a matrícula do funcionário a ser atualizado.');
        return;
    }

    const nome = document.getElementById('updateNome').value;
    const cpf = document.getElementById('updateCPF').value;
    const identidade = document.getElementById('updateIdentidade').value;
    const dataNascimento = document.getElementById('updateDataNascimento').value;
    const genero = document.getElementById('updateGenero').value;
    
    const cep = document.getElementById('updateCEP').value;
    const rua = document.getElementById('updateRua').value;
    const numero = document.getElementById('updateNumero').value;
    const bairro = document.getElementById('updateBairro').value;
    const cidade = document.getElementById('updateCidade').value;
    const uf = document.getElementById('updateUF').value;
    const complemento = document.getElementById('updateComplemento').value;
    
    const addressFields = [cep, rua, numero, bairro, cidade, uf];
    const isUpdatingAddress = addressFields.some(field => field && field.trim() !== '');

    let enderecoFormatado = null; // Inicia como nulo

    if (isUpdatingAddress) {
    if (!cep || !rua || !numero || !bairro || !cidade || !uf) {
        alert('Para ATUALIZAR o endereço, todos os campos de endereço (CEP, Rua, Número, Bairro, Cidade, UF) devem ser preenchidos.');
        return;
    }

    enderecoFormatado = `${rua}, ${numero}` +
                       `${complemento ? ', ' + complemento : ''}` +
                       `, ${bairro} - ${cidade}/${uf}` +
                       ` - CEP: ${cep}`;
    }

    const telPrincipal = document.getElementById('updateTelPrincipal').value;
    const telSecundario = document.getElementById('updateTelSecundario').value;
    const email = document.getElementById('updateEmail').value;
    const cargo = document.getElementById('updateCargo').value;
    const salario = document.getElementById('updateSalario').value;
    const centroCusto = document.getElementById('updateCentroCusto').value;
    const setor = document.getElementById('updateSetor').value;
    const matriculaSuperior = document.getElementById('updateMatriculaSuperior').value;
    const nomeSuperior = document.getElementById('updateNomeSuperior').value;
    const dataAdmissao = document.getElementById('updateDataAdmissao').value;
    const dataDemissao = document.getElementById('updateDataDemissao').value;
    const status = document.getElementById('updateStatus').value;

    const formData = new FormData();
    if (nome) formData.append('nome', nome);
    if (cpf) formData.append('cpf', cpf);
    if (identidade) formData.append('identidade', identidade);
    if (dataNascimento) formData.append('data_nascimento', dataNascimento);
    if (genero) formData.append('genero', genero);

    
    if (enderecoFormatado) {
        formData.append('endereco', enderecoFormatado);
    }


    if (telPrincipal) formData.append('tel_principal', telPrincipal);
    if (telSecundario) formData.append('tel_secundario', telSecundario);
    if (email) formData.append('email', email);
    if (cargo) formData.append('cargo', cargo);
    if (salario) formData.append('salario', salario);
    if (centroCusto) formData.append('centro_custo', centroCusto);
    if (setor) formData.append('setor', setor);
    if (matriculaSuperior) formData.append('matricula_superior', matriculaSuperior);
    if (nomeSuperior) formData.append('nome_superior', nomeSuperior);
    if (dataAdmissao) formData.append('data_admissao', dataAdmissao);
    if (dataDemissao) formData.append('data_demissao', dataDemissao);
    if (status) formData.append('status', status);

    // Verifica se pelo menos um campo de atualização foi preenchido
    if ([...formData.entries()].length === 0) {
        alert('Nenhum dado foi preenchido para atualização.');
        return;
    }

    const url = `${API_BASE_URL}/employee?matricula=${matricula}`;

    try {
        const response = await fetchWithAuth(url, {
            method: 'PUT',
            body: formData,
        });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const result = await response.json();

        if (response.ok) {
            alert(`Cadastro do funcionário de matrícula ${result.matricula} atualizado com sucesso!`);
            clearForm('updateEmployeeForm');
        } else {
            alert(`Erro ao atualizar cadastro: ${result.mesage || 'Ocorreu um erro desconhecido.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};

/**
 * Coleta os dados do formulário de exclusão, pede confirmação e envia a requisição para a API via DELETE.
 * Utilizada em: 'index.html', no 'onclick' do botão "Excluir" do formulário 'deleteEmployeeForm'.
 */
const deleteEmployee = async () => {
    const nome = document.getElementById('deleteEmployeeNome').value;
    const matricula = document.getElementById('deleteEmployeeMatricula').value;
    const cpf = document.getElementById('deleteEmployeeCPF').value;

    if (!nome || !matricula || !cpf) {
        alert("Por favor, preencha todos os campos para confirmar a exclusão.");
        return;
    }
    
    if (!confirm(`Tem certeza que deseja excluir o funcionário '${nome}'? Esta ação é irreversível.`)) {
        return;
    }

    const params = new URLSearchParams();
    params.append('nome', nome);
    params.append('matricula', matricula);
    params.append('cpf', cpf);

    const url = `${API_BASE_URL}/employee?${params.toString()}`;

    try {
        const response = await fetchWithAuth(url, {
            method: 'DELETE',
        });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const result = await response.json();

        if (response.ok) {
            alert(`${result.mesage}\nFuncionário: ${result.Nome}`);
            clearDeleteEmployee();
        } else {
            alert(`Erro ao excluir: ${result.mesage || 'Ocorreu um erro desconhecido.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição de exclusão:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};

// ==========================================================================
// LÓGICA DE BUSCA, EXIBIÇÃO E PAGINAÇÃO
// ==========================================================================

/**
 * Formata uma string de data (ex: 'AAAA-MM-DD') para o padrão brasileiro (DD/MM/AAAA).
 * @param {string} dateString
 * @returns {string}
 * Utilizada em: 'displayEmployees' e na formatação de dados para exportação no 'exportEmployeeBtn'.
 */
function formatDate(dateString) {
    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);

    // Checa se a data é válida para evitar exibir "NaN/NaN/NaN"
    if (isNaN(date.getTime())) {
        return 'Data inválida';
    }

    // Formatar datas, respeitando a localidade.
    // O fuso horário 'UTC' garante que a data não seja alterada pelo fuso do navegador.
    const formatter = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC' 
    });

    return formatter.format(date);
}

/**
 * Renderiza a lista de funcionários na tabela HTML.
 * @param {Array} employeeList
 * Utilizada em: Chamada por 'displayCurrentEmployeePage' e 'searchEmployee'.
 */
function displayEmployees(employeeList) {
    const tableBody = document.getElementById('employeeTableBody');
    tableBody.innerHTML = ''; 

    if (!employeeList || employeeList.length === 0) {
        //const row = tableBody.insertRow();
        //const cell = row.insertCell();
        //cell.colSpan = 20;
        //cell.textContent = 'Nenhum funcionário encontrado.';
        //cell.style.textAlign = 'center';
        return;
    }

    employeeList.forEach(employee => {
        const row = tableBody.insertRow();

        row.insertCell().textContent = employee.nome || '';
        row.insertCell().textContent = employee.cpf || '';
        row.insertCell().textContent = employee.matricula || '';
        row.insertCell().textContent = employee.identidade || '';
        row.insertCell().textContent = formatDate(employee.data_nascimento);
        row.insertCell().textContent = employee.genero || '';
        row.insertCell().textContent = employee.endereco || '';
        row.insertCell().textContent = employee.tel_principal || '';
        row.insertCell().textContent = employee.tel_secundario || '';
        row.insertCell().textContent = employee.email || '';
        row.insertCell().textContent = employee.cargo || '';
        row.insertCell().textContent = employee.salario || '';
        row.insertCell().textContent = employee.centro_custo || '';
        row.insertCell().textContent = employee.setor || '';
        row.insertCell().textContent = employee.matricula_superior || '';
        row.insertCell().textContent = employee.nome_superior || '';
        row.insertCell().textContent = formatDate(employee.data_admissao);
        row.insertCell().textContent = formatDate(employee.data_demissao);

        row.insertCell().textContent = employee.status || '';

        // Célula especial para as anotações
        const notesCell = row.insertCell();
        notesCell.className = 'notes-cell'
        if (employee.notes && employee.notes.length > 0) {
            notesCell.innerHTML = employee.notes.map(note => {
                // Converte as quebras de linha (\n) do texto em tags <br>
                const formattedText = note.text.replace(/(\r\n|\n|\r)/g, '<br>');
                return `<b>ID ${note.id}:</b> ${formattedText}`;
            }).join('<br>');
        } else {
            notesCell.textContent = '';
        }
    });

    updateEmployeePaginationControls();

}

/**
 * Busca funcionários por critérios específicos, armazena os resultados e inicia a paginação.
 * Utilizada em: 'index.html', no 'onclick' do botão "Buscar" do formulário 'searchEmployeeForm'.
 */
const searchEmployee = async () => {
    updateEmployeeCountDisplay(null); // Garante que a contagem da busca geral seja escondida
    resetEmployeePaginationState()
    const nome = document.getElementById('searchByNome').value;
    const matricula = document.getElementById('searchByMatricula').value;
    const cpf = document.getElementById('searchByCPF').value;

    if (!nome && !matricula && !cpf) {
        alert('Por favor, preencha pelo menos um campo para a busca.');
        return;
    }

    const params = new URLSearchParams();
    if (nome) params.append('nome', nome);
    if (matricula) params.append('matricula', matricula);
    if (cpf) params.append('cpf', cpf);

    const url = `${API_BASE_URL}/employee?${params.toString()}`;

    try {
        const response = await fetchWithAuth(url, { method: 'GET' });
        
        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const data = await response.json();

        if (response.ok) {
            if (data.employees && data.employees.length > 0) {
                displayEmployees(data.employees);
            } else {
                alert('Nenhum funcionário encontrado para os critérios informados.');
                displayEmployees([]);
            }
        } else {
            alert(`Erro na busca: ${data.mesage || 'Ocorreu um erro.'}`);
            displayEmployees([]);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};

/**
 * Busca TODOS os funcionários, armazena os resultados e inicia a paginação.
 * Utilizada em: 'index.html', no 'onclick' do botão "Buscar Todos" do formulário 'searchEmployeeForm'.
 */
const searchAllEmployees = async () => {
    const url = `${API_BASE_URL}/employees`;

    try {
        const response = await fetchWithAuth(url, { method: 'GET' });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const data = await response.json();

        if (response.ok) {
            completeEmployeeList = data.all_employees || [];
            const totalCount = completeEmployeeList.length > 0 ? completeEmployeeList[0].total_employees : 0;
            updateEmployeeCountDisplay(totalCount);

            if (completeEmployeeList.length === 0) {
                alert('Não há funcionários cadastrados na base de dados.');
                displayEmployees([]);
                return;
            }

            currentEmployeePage = 1;
            totalEmployeePages = Math.ceil(completeEmployeeList.length / ROWS_PER_PAGE);
            displayCurrentEmployeePage();
        } else {
            alert(`Erro na busca: ${data.mesage || 'Ocorreu um erro.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};

/**
 * Atualiza a exibição da contagem de funcionários.
 * @param {number|null} count
 */
function updateEmployeeCountDisplay(count) {
    const countElement = document.getElementById('employeeCount');
    if (count && count > 0) {
        countElement.textContent = `${count} funcionários encontrados.`;
        countElement.classList.remove('hidden');
    } else {
        countElement.textContent = ''; // Limpa o texto
        countElement.classList.add('hidden'); // Esconde o elemento
    }
}
/**
 * Função que irá "fatiar" a lista completa e chamar a função de exibição
 */
function displayCurrentEmployeePage() {
    const startIndex = (currentEmployeePage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const paginatedItems = completeEmployeeList.slice(startIndex, endIndex);
    displayEmployees(paginatedItems);
}
/**
 * Função para limpar os campos do formulário de busca.
 */
function clearFormSearch() {
    document.getElementById('searchEmployeeForm').reset();
    document.getElementById('employeeTableBody').innerHTML = '';
    resetEmployeePaginationState();
    updateEmployeeCountDisplay(null);
    
    resetEmployeeDashboard();
}
/**
 * Função de paginação
 */
function previousEmployeePage(event) {
    event.preventDefault();
    if (currentEmployeePage > 1) {
        currentEmployeePage--;
        displayCurrentEmployeePage();
    }
}
/**
 * Função de paginação
 */
function nextEmployeePage(event) {
    event.preventDefault();
    if (currentEmployeePage < totalEmployeePages) {
        currentEmployeePage++;
        displayCurrentEmployeePage();
    }
}
/**
 * Função para atualizar o estado dos botões e o texto de informação
 */
function updateEmployeePaginationControls() {
    const pageInfo = document.getElementById('page-info-employee');
    const prevButton = document.querySelector('.paginatioContainer a[onclick^="previousEmployeePage"]');
    const nextButton = document.querySelector('.paginatioContainer a[onclick^="nextEmployeePage"]');
    const paginationContainer = document.querySelector('.paginatioContainer');

    if (completeEmployeeList.length > 0 && totalEmployeePages > 1) {
        paginationContainer.style.display = 'flex'; // 'flex' ativa o space-between do CSS
        pageInfo.textContent = `Página ${currentEmployeePage} de ${totalEmployeePages}`;
        prevButton.classList.toggle('disabled', currentEmployeePage <= 1);
        nextButton.classList.toggle('disabled', currentEmployeePage >= totalEmployeePages);
    } else {
        paginationContainer.style.display = 'none';
    }
}
/**
 * Reseta o estado da paginação, limpando a lista de funcionários e redefinindo os contadores de página.
 */
function resetEmployeePaginationState() {
    completeEmployeeList = [];
    currentEmployeePage = 1;
    totalEmployeePages = 1;
    updateEmployeePaginationControls();
}

/**
 * =========================================================================
 * FUNÇÕES DE GERAÇÃO DE QR CODE
 * =========================================================================
 */
/**
 * Função auxiliar para mostrar o link de download
 */
function showDownloadLink(pdfBlob, fileName) {
    // Revoga a URL antiga (se existir) para liberar a memória do PDF anterior.
    if (currentObjectUrl) {
        window.URL.revokeObjectURL(currentObjectUrl);
    }

    const downloadUrl = window.URL.createObjectURL(pdfBlob);
    
    // Guarda a nova URL na variável de estado para poder ser revogada no futuro.
    currentObjectUrl = downloadUrl;
    
    // Exibi o link.
    const link = document.getElementById('downloadLink');
    link.href = downloadUrl;
    link.download = fileName; 
    link.textContent = `Clique aqui para baixar "${fileName}"`; 
    link.classList.remove('hidden');
}
/** 
 * Função para gerar QR Codes para matrículas específicas.
*/
const generateQRCodes = async () => {
    const matriculasInput = document.getElementById('employeeQRCodeMatricula').value;

    if (!matriculasInput.trim()) {
        alert('Por favor, informe ao menos uma matrícula.');
        return;
    }

    const formData = new FormData();
    formData.append('matriculas', matriculasInput);
    const url = `${API_BASE_URL}/employee/print_tag`;

    try {
        const response = await fetchWithAuth(url, {
            method: 'POST',
            body: formData,
        });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        if (response.ok) {
            // Verifica se o cabeçalho com os funcionários não encontrados existe
            const notFoundHeader = response.headers.get('X-Not-Found-Matriculas');
            if (notFoundHeader) {
                // Se existir, mostra um alerta para o usuário
                alert(`Atenção: O PDF foi gerado, mas as seguintes matrículas não foram encontradas: ${notFoundHeader}`);
            }

            const pdfBlob = await response.blob();
            showDownloadLink(pdfBlob, 'etiquetas_qrcodes.pdf');
            // Limpa o input do formulário após tudo ter dado certo.
            clearFormQRCode(true); 
        } else {
            const errorData = await response.json();
            alert(`Erro ao gerar PDF: ${errorData.mesage || 'Ocorreu um erro.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor para gerar os QR Codes.');
    }
};

/**
 * Função para gerar QR Codes para TODOS os funcionários.
 * IMPORTANTE: Estudar um método melhor para gerar QR code para todas as matrículas,
 * visando a eficiência e redução do uso de recursos computacionais: memória RAM, por exemplo.
 */
const generateAllQRCodes = async () => {
    if (!confirm('Esta ação pode demorar um pouco se houver muitos funcionários. Deseja continuar?')) {
        return;
    }

    const url = `${API_BASE_URL}/employee/print_all_tags`;

    try {
        const response = await fetchWithAuth(url, { method: 'GET' });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        if (response.ok) {
            const pdfBlob = await response.blob();
            showDownloadLink(pdfBlob, 'etiquetas_todos_qrcodes.pdf');
            clearFormQRCode(true);
        } else {
            const errorData = await response.json();
            alert(`Erro ao gerar PDF: ${errorData.mesage || 'Ocorreu um erro.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor para gerar os QR Codes.');
    }
};


/**
 * Função para limpar o formulário de geração de QR Code e ocultar o link de download.
 */
/**
 * @param {boolean} keepLinkVisible - Se true, não esconde o link de download.
 */
function clearFormQRCode(keepLinkVisible = false) {
    document.getElementById('employeeQRCodeForm').reset();
    
    if (!keepLinkVisible) {
        const link = document.getElementById('downloadLink');
        link.classList.add('hidden');
        link.href = '#';
        link.textContent = '';

        // Revogar a URL ao limpar completamente o formulário
        if (currentObjectUrl) {
            window.URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
    }
}

/**
 * =========================================================================
 * FUNÇÕES DA SEÇÃO DE ANOTAÇÕES
 * =========================================================================
 */
/**
 * Adiciona uma nova anotação para um funcionário.
 */
const addEmployeeNote = async () => {
    const matricula = document.getElementById('employeeNotesText').value;
    const text = document.getElementById('notesText').value;
    const category = document.getElementById('employeeNotesCategory').value;

    if (!matricula || !text) {
        alert('Para salvar uma nova anotação, a Matrícula e o Texto da anotação são obrigatórios.');
        return;
    }

    const formData = new FormData();
    formData.append('employee_matricula', matricula);
    formData.append('text', text);
    
    if (category) {
        formData.append('category', category);
    }

    const url = `${API_BASE_URL}/note`;

    try {
        const response = await fetchWithAuth(url, {
            method: 'POST',
            body: formData,
        });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const result = await response.json();

        if (response.ok) { // Sucesso é status 201 (Created)
            alert(`Nova anotação (ID: ${result.id}) salva com sucesso para o funcionário de matrícula ${matricula}!`);
            employeeClearFormNotes();
        } else {
            alert(`Erro ao salvar anotação: ${result.mesage || 'Ocorreu um erro desconhecido.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};

/**
 * Atualiza (edita) uma anotação existente.
 * Usa o método PUT.
 */
const updateEmployeeNote = async () => {
    const matricula = document.getElementById('employeeNotesText').value;
    const noteId = document.getElementById('employeeNotesId').value;
    const text = document.getElementById('notesText').value;
    const category = document.getElementById('employeeNotesCategory').value;

    if (!matricula || !noteId) {
        alert('Para salvar uma edição, a Matrícula e o ID da anotação são obrigatórios.');
        return;
    }

    if (!text && !category) {
        alert('Preencha o campo de Anotação e/ou Categoria para salvar a edição.');
        return;
    }

    // Monta o FormData APENAS com os campos que o usuário preencheu.
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (category) formData.append('category', category);

    // Monta a URL com os identificadores como query parameters.
    const url = `${API_BASE_URL}/note?id=${noteId}&employee_matricula=${matricula}`;

    try {
        const response = await fetchWithAuth(url, {
            method: 'PUT',
            body: formData,
        });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const result = await response.json();

        if (response.ok) {
            alert(`Anotação (ID: ${result.id}) atualizada com sucesso!`);
            employeeClearFormNotes();
        } else {
            alert(`Erro ao atualizar anotação: ${result.mesage || 'Ocorreu um erro desconhecido.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};

/**
 * Limpa todos os campos do formulário de anotações.
 */
function employeeClearFormNotes() {
    document.getElementById('employeeNotesForm').reset();
}

/**
 * =========================================================================
 * FUNÇÕES DA SEÇÃO DE ACESSO AOS ÔNIBUS
 * =========================================================================
 */

// ---------------- Funções Auxiliares para Acesso aos Ônibus ----------------

/**
 * Formata uma string de data e hora para o formato DD/MM/AAAA HH:MM:SS.
 */
// --- Formatadores de Data e Hora ---
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false // Garante o formato 24h
});

/**
 * Função principal para exibir uma lista de acessos na tabela de ônibus.
 * @param {Array} accessList - Uma lista de objetos de acesso.
 */
function displayBusAccess(accessList) {
    const tableBody = document.getElementById('busAccessTableBody');
    tableBody.innerHTML = '';

    if (!accessList || accessList.length === 0) {
        return;
    }

    accessList.forEach(access => {
        const row = tableBody.insertRow();
        
        row.insertCell().textContent = access.nome || '';
        row.insertCell().textContent = access.matricula || '';
        row.insertCell().textContent = access.bus_number || '';
        
        // Converte a string da API em um objeto de data
        const dateObj = new Date(access.timestamp);

        // Células de Data e Hora, usando os formatadores
        row.insertCell().textContent = isNaN(dateObj) ? 'Data Inválida' : dateFormatter.format(dateObj);
        row.insertCell().textContent = isNaN(dateObj) ? 'Hora Inválida' : timeFormatter.format(dateObj);
    });

    updateBusAccessPaginationControls();
}

/**
 * Exibe a página atual da lista completa de acessos.
 */
function displayCurrentBusAccessPage() {
    const startIndex = (currentBusAccessPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    const paginatedItems = completeBusAccessList.slice(startIndex, endIndex);
    displayBusAccess(paginatedItems);
}

/**
 * Atualiza os controles de paginação da tabela de acessos.
 */
function updateBusAccessPaginationControls() {
    const pageInfo = document.getElementById('page-info-bus-access');
    const prevButton = document.querySelector('#busAccessForm .pagination-nav a[onclick^="previousBusAccessPage"]');
    const nextButton = document.querySelector('#busAccessForm .pagination-nav a[onclick^="nextBusAccessPage"]');
    const paginationContainer = document.querySelector('#busAccessForm .paginatioContainer');

    if (completeBusAccessList.length > 0 && totalBusAccessPages > 1) {
        paginationContainer.style.display = 'flex';
        pageInfo.textContent = `Página ${currentBusAccessPage} de ${totalBusAccessPages}`;
        prevButton.classList.toggle('disabled', currentBusAccessPage <= 1);
        nextButton.classList.toggle('disabled', currentBusAccessPage >= totalBusAccessPages);
    } else {
        paginationContainer.style.display = 'none';
    }
}

/**
 * Navega para a página anterior de resultados de acesso.
 */
function previousBusAccessPage(event) {
    event.preventDefault();
    if (currentBusAccessPage > 1) {
        currentBusAccessPage--;
        displayCurrentBusAccessPage();
    }
}

/**
 * Navega para a próxima página de resultados de acesso.
 */
function nextBusAccessPage(event) {
    event.preventDefault();
    if (currentBusAccessPage < totalBusAccessPages) {
        currentBusAccessPage++;
        displayCurrentBusAccessPage();
    }
}

/**
 * Reseta o estado da paginação da tabela de acessos.
 */
function resetBusAccessPaginationState() {
    completeBusAccessList = [];
    currentBusAccessPage = 1;
    totalBusAccessPages = 1;
    updateBusAccessPaginationControls();
    updateBusAccessCountDisplay(null);
}

/**
 * Limpa o formulário e a tabela de resultados de acesso aos ônibus.
 */
function clearFormBusAccess() {
    document.getElementById('busAccessForm').reset();
    document.getElementById('busAccessTableBody').innerHTML = '';
    resetBusAccessPaginationState();
    resetBusAccessDashboard();
}

/**
 * Atualiza a exibição da contagem de registros de acesso.
 * @param {number|null} count - O número de registros a ser exibido, ou null para esconder.
 */
function updateBusAccessCountDisplay(count) {
    const countElement = document.getElementById('busAccessCount');
    if (count !== null && count >= 0) {
        countElement.textContent = `${count} registro(s) encontrado(s).`;
        countElement.classList.remove('hidden');
    } else {
        countElement.textContent = '';
        countElement.classList.add('hidden');
    }
}

/**
 * Função genérica para processar os resultados da API de acesso e ativar a paginação.
 */
function processAndPaginateBusAccess(normalizedData, totalCount, errorMessage = 'Nenhum registro de acesso encontrado.') {
    completeBusAccessList = normalizedData || [];
    updateBusAccessCountDisplay(totalCount);

    if (totalCount === 0) {
        if(errorMessage) alert(errorMessage);
        displayBusAccess([]);
        return;
    }

    currentBusAccessPage = 1;
    totalBusAccessPages = Math.ceil(totalCount / ROWS_PER_PAGE);
    displayCurrentBusAccessPage();
}

// ---------------- Funções de Busca para Acesso aos Ônibus ----------------

/**
 * Busca e exibe todos os registros de acesso, ativando a paginação.
 */
const busAccessAll = async () => {
    resetBusAccessPaginationState();
    const url = `${API_BASE_URL}/bus_access/all`;

    try {
        const response = await fetchWithAuth(url);

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const data = await response.json();

        if (response.ok) {
            const normalizedData = data.bus_accesses.map(access => ({
                nome: access.employee.nome,
                matricula: access.employee.matricula,
                bus_number: access.bus_number,
                timestamp: access.timestamp
            }));
            processAndPaginateBusAccess(normalizedData, data.total_accesses, 'Nenhum registro de acesso encontrado na base de dados.');
        } else {
            processAndPaginateBusAccess([], 0, `Erro na busca: ${data.mesage || 'Ocorreu um erro.'}`);
        }
    } catch (error) {
        processAndPaginateBusAccess([], 0, 'Não foi possível conectar ao servidor.');
        console.error('Erro na requisição:', error);
    }
};

/**
 * Busca acessos por número de ônibus e exibe na tabela com paginação.
 */
const searchBusAccessByNumber = async () => {
    resetBusAccessPaginationState();
    const busNumber = document.getElementById('busAccessByNumber').value;
    if (!busNumber) { alert('Por favor, informe o número do ônibus.'); return; }

    const url = `${API_BASE_URL}/bus_access/by_bus?bus_number=${busNumber}`;

    try {
        const response = await fetchWithAuth(url);

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const data = await response.json();

        if (response.ok) {
            const normalizedData = data.employees.flatMap(employee =>
                employee.accesses.map(access => ({
                    nome: employee.nome,
                    matricula: employee.matricula,
                    bus_number: data.bus_number,
                    timestamp: access.timestamp
                }))
            );
            processAndPaginateBusAccess(normalizedData, data.total_accesses, null);
        } else {
            processAndPaginateBusAccess([], 0, `Erro na busca: ${data.mesage || 'Ocorreu um erro.'}`);
        }
    } catch (error) {
        processAndPaginateBusAccess([], 0, 'Não foi possível conectar ao servidor.');
        console.error('Erro na requisição:', error);
    }
};

/**
 * Busca acessos por data específica e exibe na tabela com paginação.
 */
const searchBusAccessByDate = async () => {
    resetBusAccessPaginationState();
    const targetDate = document.getElementById('busAccessByDate').value;
    if (!targetDate) { alert('Por favor, informe a data.'); return; }

    const url = `${API_BASE_URL}/bus_access/by_date?target_date=${targetDate}`;

    try {
        const response = await fetchWithAuth(url);

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const data = await response.json();

        if (response.ok) {
            const normalizedData = data.daily_report.flatMap(bus =>
                bus.accesses_by_employee.flatMap(employee =>
                    employee.times.map(time => ({
                        nome: employee.nome,
                        matricula: employee.matricula,
                        bus_number: bus.bus_number,
                        timestamp: `${data.date}T${time}Z`
                    }))
                )
            );

            processAndPaginateBusAccess(normalizedData, data.total_accesses, null);
        } else {

            processAndPaginateBusAccess([], 0, data.mesage);
        }
    } catch (error) {
        processAndPaginateBusAccess([], 0, 'Não foi possível conectar ao servidor.');
        console.error('Erro na requisição:', error);
    }
};

/**
 * Busca acessos por matrícula de funcionário e exibe na tabela com paginação.
 */
const searchBusAccessByMatricula = async () => {
    resetBusAccessPaginationState();
    const matricula = document.getElementById('busAccessByMatricula').value;
    if (!matricula) { alert('Por favor, informe a matrícula do funcionário.'); return; }
    
    const url = `${API_BASE_URL}/bus_access/by_employee?matricula=${matricula}`;
    
    try {
        const response = await fetchWithAuth(url);

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const data = await response.json();

        if (response.ok) {
            const normalizedData = data.accesses.map(access => ({
                nome: data.nome,
                matricula: data.matricula,
                bus_number: access.bus_number,
                timestamp: access.timestamp
            }));

            processAndPaginateBusAccess(normalizedData, data.total_accesses, null);

        } else {
            processAndPaginateBusAccess([], 0, `Erro na busca: ${data.mesage || 'Ocorreu um erro.'}`);
        }
    } catch (error) {
        processAndPaginateBusAccess([], 0, 'Não foi possível conectar ao servidor.');
        console.error('Erro na requisição:', error);
    }
};

/**
 * =========================================================================
 * FUNÇÕES DA SEÇÃO DE DELEÇÃO DE FUNCIONÁRIO
 * =========================================================================
 */

/**
 * Limpa os campos do formulário de deleção.
 */
function clearDeleteEmployee() {
    document.getElementById('deleteEmployeeForm').reset();
}

/**
 * =========================================================================
 * FUNCIONALIDADE DE EXPORTAÇÃO PARA EXCEL
 * =========================================================================
 */

const exportEmployeeBtn = document.getElementById('exportEmployeeBtn');
const exportBusAccessBtn = document.getElementById('exportBusAccessBtn');

/**
 * Função genérica que converte um array de dados em um arquivo .xlsx e inicia o download.
 * @param {Array<Object>} data
 * @param {Array<string>} headers
 * @param {string} filename
 */
function exportToExcel(data, headers, filename) {
    // Cria uma planilha a partir dos dados. O SheetJS usará os headers para as colunas.
    const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });

    // Cria um livro e adiciona a planilha
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");

    // Gera o arquivo e dispara o download
    XLSX.writeFile(workbook, filename);
}

/**
 * Prepara e exporta os dados dos funcionários quando o botão é clicado.
 * Utilizado em: Evento 'click' do botão 'exportEmployeeBtn' ('id="exportEmployeeBtn"').
 */
exportEmployeeBtn.addEventListener('click', () => {
    if (completeEmployeeList.length === 0) {
        alert("A exportação só é realizada após uma busca em massa ('Buscar Todos').");
        return;
    }

    const employeeHeaders = [
        'Nome Completo', 'Matrícula', 'CPF', 'Identidade', 'Data de Nascimento',
        'Gênero', 'Endereço', 'Telefone Principal', 'Telefone Secundário', 'E-mail',
        'Cargo', 'Salário', 'Centro de Custo', 'Setor', 'Matrícula do Superior',
        'Nome do Superior', 'Data de Admissão', 'Data de Demissão', 'Status', 'Anotações'
    ];
    
    // Mapeia os dados para um novo array de objetos com as chaves corretas e formatadas
    const dataToExport = completeEmployeeList.map(emp => {
        // --- LÓGICA PARA FORMATAR AS ANOTAÇÕES ---
        // Pega o array de anotações do funcionário
        const notesArray = emp.notes || [];
        // Formata cada anotação e as une em um único texto com quebra de linha
        const formattedNotes = notesArray.length > 0
            ? notesArray.map(note => `ID ${note.id}: ${note.text}`).join('\n')
            : '';
        // -----------------------------------------
        return {
            'Nome Completo': emp.nome,
            'Matrícula': emp.matricula,
            'CPF': emp.cpf,
            'Identidade': emp.identidade,
            'Data de Nascimento': formatDate(emp.data_nascimento),
            'Gênero': emp.genero,
            'Endereço': emp.endereco,
            'Telefone Principal': emp.tel_principal,
            'Telefone Secundário': emp.tel_secundario || '',
            'E-mail': emp.email || '',
            'Cargo': emp.cargo,
            'Salário': emp.salario,
            'Centro de Custo': emp.centro_custo,
            'Setor': emp.setor,
            'Matrícula do Superior': emp.matricula_superior,
            'Nome do Superior': emp.nome_superior,
            'Data de Admissão': formatDate(emp.data_admissao),
            'Data de Demissão': formatDate(emp.data_demissao),
            'Status': emp.status,
            'Anotações': formattedNotes
        };
    });

    exportToExcel(dataToExport, employeeHeaders, 'lista_de_funcionarios.xlsx');
});

/**
 * Prepara e exporta os dados de acesso ao ônibus quando o botão é clicado.
 * Utilizado em: Evento 'click' do botão 'exportBusAccessBtn' ('id="exportBusAccessBtn"').
 */
exportBusAccessBtn.addEventListener('click', () => {
    if (completeBusAccessList.length === 0) {
        alert("Nenhuma busca de acessos foi realizada. Exporte após buscar os dados.");
        return;
    }

    // Define os cabeçalhos em um array para garantir a ordem
    const busAccessHeaders = [
        'Nome do Funcionário', 'Matrícula', 'Número do Ônibus', 'Data do Acesso', 'Hora do Acesso'
    ];

    // Formata a lista de acessos para ter data e hora separadas antes de exportar
    const dataToExport = completeBusAccessList.map(access => {
        const dateObj = new Date(access.timestamp);
        return {
            'Nome do Funcionário': access.nome,
            'Matrícula': access.matricula,
            'Número do Ônibus': access.bus_number,
            'Data do Acesso': isNaN(dateObj) ? 'Inválido' : dateFormatter.format(dateObj),
            'Hora do Acesso': isNaN(dateObj) ? 'Inválido' : timeFormatter.format(dateObj)
        };
    });
    
    exportToExcel(dataToExport, busAccessHeaders, 'relatorio_de_acessos.xlsx');
});


/**
 * =========================================================================
 * FUNÇÕES DA SEÇÃO DE GERAR CONTRATO
 * =========================================================================
 */

/**
 * Limpa o formulário de geração de contrato e esconde o link de download.
 */
function clearFormContract() {
    clearForm('employmentContractDataForm');
    const link = document.getElementById('contractDownloadLink');
    
    link.classList.add('hidden'); // <-- Adiciona 'hidden' ao link, não ao container
    link.href = '#';
    link.textContent = '';
    link.removeAttribute('download');
}

/**
 * Coleta todos os dados do formulário de contrato e envia para o backend
 * para gerar o PDF.
 */
const generateContract = async () => {
    // Coleta de dados (Empresa)
    const contractRazaoSocial = document.getElementById('contractRazaoSocial').value;
    const contractCNPJ = document.getElementById('contractCNPJ').value;
    const contractCEP = document.getElementById('contractCEP').value;
    const contractRua = document.getElementById('contractRua').value;
    const contractNumero = document.getElementById('contractNumero').value;
    const contractBairro = document.getElementById('contractBairro').value;
    const contractCidade = document.getElementById('contractCidade').value;
    const contractUF = document.getElementById('contractUF').value;
    const contractRepresentante = document.getElementById('contractRepresentante').value;
    const contractRepCPF = document.getElementById('contractRepCPF').value;

    // Coleta de dados (Funcionário)
    const contractMatricula = document.getElementById('contractMatricula').value;
    const contractNomeCompleto = document.getElementById('contractNomeCompleto').value;
    const contractCPF = document.getElementById('contractCPF').value;
    const contractIdentidade = document.getElementById('contractIdentidade').value;
    const contractCargo = document.getElementById('contractCargo').value;
    const contractSetor = document.getElementById('contractSetor').value;
    const contractDataAdmissao = document.getElementById('contractDataAdmissao').value;
    const contractFuncionarioCEP = document.getElementById('contractFuncionarioCEP').value;
    const contractFuncionarioRua = document.getElementById('contractFuncionarioRua').value;
    const contractFuncionarioNumero = document.getElementById('contractFuncionarioNumero').value;
    const contractFuncionarioBairro = document.getElementById('contractFuncionarioBairro').value;
    const contractFuncionarioCidade = document.getElementById('contractFuncionarioCidade').value;
    const contractFuncionarioUF = document.getElementById('contractFuncionarioUF').value;
    const contractFuncionarioComplemento = document.getElementById('contractFuncionarioComplemento').value;
    const contractNacionalidade = document.getElementById('contractNacionalidade').value;
    const contractEstadoCivil = document.getElementById('contractEstadoCivil').value;
    const contractSalarioBruto = document.getElementById('contractSalarioBruto').value;
    const contractValorExtenso = document.getElementById('contractValorExtenso').value;
    const contractCidadeAdmissao = document.getElementById('contractCidadeAdmissao').value;
    
    // Validação de todos os campos obrigatórios
    const requiredFields = [
        contractRazaoSocial, contractCNPJ, contractCEP, contractRua, contractNumero, 
        contractBairro, contractCidade, contractUF, contractRepresentante, contractRepCPF,
        contractMatricula, contractNomeCompleto, contractCPF, contractIdentidade, 
        
        contractCargo, contractSetor, contractDataAdmissao,

        contractFuncionarioCEP, contractFuncionarioRua, contractFuncionarioNumero, 
        contractFuncionarioBairro, contractFuncionarioCidade, contractFuncionarioUF,
        contractNacionalidade, contractEstadoCivil, contractSalarioBruto, 
        contractValorExtenso, contractCidadeAdmissao
    ];

    if (requiredFields.some(field => !field || field.trim() === '')) {
        alert('Por favor, preencha todos os campos obrigatórios (*) para gerar o contrato.');
        return;
    }
    
    if (contractSalarioBruto.length > 15) {
        alert('Salário bruto inválido. Por favor, verifique o valor informado.');
        return;
    }
    
    // Monta o FormData
    const formData = new FormData();
    formData.append('contractRazaoSocial', contractRazaoSocial);
    formData.append('contractCNPJ', contractCNPJ);
    formData.append('contractCEP', contractCEP);
    formData.append('contractRua', contractRua);
    formData.append('contractNumero', contractNumero);
    formData.append('contractBairro', contractBairro);
    formData.append('contractCidade', contractCidade);
    formData.append('contractUF', contractUF);
    formData.append('contractRepresentante', contractRepresentante);
    formData.append('contractRepCPF', contractRepCPF);
    formData.append('contractMatricula', contractMatricula);
    formData.append('contractNomeCompleto', contractNomeCompleto);
    formData.append('contractCPF', contractCPF);
    formData.append('contractIdentidade', contractIdentidade);
    formData.append('contractCargo', contractCargo);
    formData.append('contractSetor', contractSetor);
    formData.append('contractDataAdmissao', contractDataAdmissao);

    formData.append('contractFuncionarioCEP', contractFuncionarioCEP);
    formData.append('contractFuncionarioRua', contractFuncionarioRua);
    formData.append('contractFuncionarioNumero', contractFuncionarioNumero);
    formData.append('contractFuncionarioBairro', contractFuncionarioBairro);
    formData.append('contractFuncionarioCidade', contractFuncionarioCidade);
    formData.append('contractFuncionarioUF', contractFuncionarioUF);
    formData.append('contractFuncionarioComplemento', contractFuncionarioComplemento);
    formData.append('contractNacionalidade', contractNacionalidade);
    formData.append('contractEstadoCivil', contractEstadoCivil);
    formData.append('contractSalarioBruto', contractSalarioBruto);
    formData.append('contractValorExtenso', contractValorExtenso);
    formData.append('contractCidadeAdmissao', contractCidadeAdmissao);

    // Envia para o Backend
    const url = `${API_BASE_URL}/employee/generate_contract`;
    try {
        const response = await fetchWithAuth(url, {
            method: 'POST',
            body: formData,
        });

        // Se fetchWithAuth retornar null (erro de auth), para aqui
        if (!response) return;

        const result = await response.json();

        if (response.ok) {
            const link = document.getElementById('contractDownloadLink');
            const fileName = `Contrato_${contractNomeCompleto.replace(/ /g, '_')}.pdf`;

            link.href = result.download_url;
            link.textContent = `Clique aqui para baixar "${fileName}"`;
            link.setAttribute('download', fileName);
            link.classList.remove('hidden'); // Garante que o link em si esteja visível

            alert(`Contrato para ${contractNomeCompleto} gerado com sucesso! Faça o download pelo (hiper)link disponibilizado abaixo.`);
            
        } else {
            alert(`Erro ao gerar contrato: ${result.mesage || 'Ocorreu um erro desconhecido.'}`);
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Não foi possível conectar ao servidor.');
    }
};


// --- Bloqueia a alteração de números com o scroll do mouse ---
document.addEventListener("DOMContentLoaded", function() {
 
    const inputs = document.querySelectorAll('input[type="number"]');

    inputs.forEach(function(input) {

        input.addEventListener('wheel', function(e) {

            if (document.activeElement === input) {

                e.preventDefault();
            }
        });
    });
});


// =========================================================================
// DASHBOARDS E GRÁFICOS (CHART.JS)
// =========================================================================


/**
 * Carrega e renderiza o Dashboard de Funcionários.
 */
const loadEmployeeDashboard = async () => {
    // Garante que o container está visível
    const container = document.getElementById('employeeDashboardContainer');
    if(container) container.classList.remove('hidden');

    const url = `${API_BASE_URL}/employees`;
    
    try {
        const response = await fetchWithAuth(url, { method: 'GET' });
        if (!response) return;

        const data = await response.json();

        if (response.ok) {
            const employees = data.all_employees || [];
            
            // Processar STATUS para os Cards
            const statusCounts = { 'A': 0, 'L': 0, 'D': 0 };
            employees.forEach(emp => {
                if (statusCounts[emp.status] !== undefined) {
                    statusCounts[emp.status]++;
                }
            });
            updateStatusCards(statusCounts);

            // Processar SETOR para o Gráfico
            const sectorCounts = {};
            employees.forEach(emp => {
                const setor = emp.setor ? emp.setor.trim() : "Não Definido";
                sectorCounts[setor] = (sectorCounts[setor] || 0) + 1;
            });

            // Se não houver dados, o gráfico quebra, então verifica
            if (employees.length > 0) {
                renderSectorDoughnut(sectorCounts, employees.length);
            } else {
                document.getElementById('sectorLegend').innerHTML = '<p style="text-align:center;">Faça uma busca para visualizar os dados.</p>';
            }

        } else {
            console.error(`Erro ao buscar dados: ${data.mesage}`);
        }
    } catch (error) {
        console.error('Erro no dashboard:', error);
    }
};

/**
 * Atualiza os números nos Cards de Status (KPIs)
 */
function updateStatusCards(counts) {
    const activeEl = document.getElementById('kpiActive');
    const leaveEl = document.getElementById('kpiLeave');
    const termEl = document.getElementById('kpiTerminated');

    if(activeEl) activeEl.textContent = counts['A'] || 0;
    if(leaveEl) leaveEl.textContent = counts['L'] || 0;
    if(termEl) termEl.textContent = counts['D'] || 0;
}

/**
 * Renderiza o gráfico de Rosca (Setores) e a Legenda
 */
function renderSectorDoughnut(dataObj, totalFuncionarios) {
    const ctxElement = document.getElementById('sectorChart');
    if (!ctxElement) return; // Segurança caso o HTML não exista

    const ctx = ctxElement.getContext('2d');
    
    if (sectorChartInstance) sectorChartInstance.destroy();

    const colors = [
        '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b',
        '#858796', '#5a5c69', '#cacacaff', '#6610f2', '#fd7e14',
        '#20c9a6', '#ff9f43'
    ];
    
    const labels = Object.keys(dataObj);
    const dataValues = Object.values(dataObj);
    const bgColors = labels.map((_, i) => colors[i % colors.length]);

    sectorChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: bgColors,
                hoverOffset: 4,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Legenda padrão desligada
                title: { display: false }
            },
            cutout: '60%',
            layout: {
                padding: 10
            }
        }
    });

    // Gera a Legenda HTML Personalizada
const legendContainer = document.getElementById('sectorLegend');
    if (legendContainer) {
        
        // Cabeçalho
        let htmlContent = `
            <div class="legend-header">
                <span>LEGENDA --- Setor: Quantidade (%)</span>
            </div>
            <div class="legend-body">
        `;

        labels.forEach((label, index) => {
            const qtd = dataValues[index];
            const percent = ((qtd / totalFuncionarios) * 100).toFixed(1);
            const color = bgColors[index];

            // Estrutura simples de 3 spans para cair nas 3 colunas do Grid
            htmlContent += `
                <div class="legend-item">
                    <span class="legend-dot" style="background-color: ${color};"></span>
                    <span class="legend-label">${label}:</span>
                    <span class="legend-value">${qtd} (${percent}%)</span>
                </div>
            `;
        });

        htmlContent += `</div>`; // Fecha corpo

        // Rodapé
        htmlContent += `
            <div class="legend-footer">
                Total Geral: ${totalFuncionarios}
            </div>
        `;
        legendContainer.innerHTML = htmlContent;
    }
}

/**
 * Reseta o Dashboard de Funcionários (usado no botão Limpar)
 */
function resetEmployeeDashboard() {
    updateStatusCards({ 'A': 0, 'L': 0, 'D': 0 });

    if (sectorChartInstance) {
        sectorChartInstance.destroy();
        sectorChartInstance = null;
    }

    const legend = document.getElementById('sectorLegend');
    if (legend) legend.innerHTML = '<p style="text-align:center; color: #665;">Faça uma busca para visualizar os dados.</p>';
}

/**
 * Carrega o Dashboard de Ônibus (Acesso/Hora)
 */
const loadBusAccessDashboard = async () => {
    const targetDate = document.getElementById('busAccessByDate').value;

    if (!targetDate) {
        alert('Por favor, selecione uma data no campo "Data" acima para gerar o gráfico.');
        return;
    }

    const container = document.getElementById('busAccessDashboardContainer');
    if(container) container.classList.remove('hidden');

    const url = `${API_BASE_URL}/bus_access/by_date?target_date=${targetDate}`;

    try {
        const response = await fetchWithAuth(url);
        if (!response) return;

        const data = await response.json();
        const hoursData = new Array(24).fill(0);

        if (response.ok) {
            if (data.daily_report) {
                data.daily_report.forEach(bus => {
                    bus.accesses_by_employee.forEach(emp => {
                        emp.times.forEach(timeStr => {
                            // timeStr ex: "07:30:00"
                            const hourPart = parseInt(timeStr.split(':')[0], 10);
                            if (hourPart >= 0 && hourPart < 24) {
                                hoursData[hourPart]++;
                            }
                        });
                    });
                });
            }
            renderBusHourlyChart(hoursData, targetDate);
        } else {
            // Se 404, exibe gráfico zerado
            const dataFormatada = formatDate(targetDate);
            alert(`Sem dados para a data ${dataFormatada}.`);
            //renderBusHourlyChart(hoursData, targetDate); 
        }

    } catch (error) {
        console.error("Erro dashboard ônibus:", error);
        alert("Erro ao gerar gráfico de ônibus.");
    }
};

/**
 * Renderiza o gráfico de linha (Ônibus)
 */
function renderBusHourlyChart(hoursArray, dateLabel) {
    const ctxElement = document.getElementById('busHourlyChart');
    if(!ctxElement) return;

    const ctx = ctxElement.getContext('2d');

    if (busHourlyChartInstance) busHourlyChartInstance.destroy();

    const labels = Array.from({length: 24}, (_, i) => `${i}h`);

    busHourlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Acessos em ${dateLabel}`,
                data: hoursArray,
                borderColor: '#0800ff',
                backgroundColor: 'rgba(8, 0, 255, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Quantidade de Acessos' },
                    ticks: { stepSize: 1 }
                },
                x: {
                    title: { display: true, text: 'Horário' }
                }
            },
            plugins: {
                title: { display: true, text: 'Pico de Utilização' }
            }
        }
    });
}



/**
 * Reseta o Dashboard de Ônibus (destrói o gráfico).
 */
function resetBusAccessDashboard() {
    if (busHourlyChartInstance) {
        busHourlyChartInstance.destroy();
        busHourlyChartInstance = null;
    }
}
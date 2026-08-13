#!/usr/bin/env python3
import re


LOWER_PARTICLES = {"de", "da", "do", "das", "dos", "del", "la", "le", "van", "von"}


def normalize_word(word: str) -> str:
    if not word:
        return word
    letters = [c for c in word if c.isalpha()]
    if not letters:
        return word
    all_upper = all(c.isupper() for c in letters)
    all_lower = all(c.islower() for c in letters)
    if all_upper:
        out: list[str] = []
        seen_alpha = False
        for c in word:
            if c.isalpha():
                out.append(c.upper() if not seen_alpha else c.lower())
                seen_alpha = True
            else:
                out.append(c)
        word = "".join(out)
    elif all_lower and len(letters) > 1:
        word = word[0].upper() + word[1:].lower() if word[0].isalpha() else word
    core = "".join(c for c in word if c.isalpha()).lower()
    if core in LOWER_PARTICLES:
        return word.lower()
    return word


def shorten_name(line: str) -> str:
    line = line.strip()
    if not line:
        return ""
    parts = line.split()
    n = len(parts)
    if n == 1:
        chosen = parts
    elif n == 2:
        chosen = [parts[0], parts[-1]]
    else:
        chosen = [parts[0], parts[1], parts[-1]]
    return " ".join(normalize_word(p) for p in chosen)


RAW = r"""
Paulo Henrique da Cruz Donna
Jeane Barboza
Denner Rodrigues Sabino de Souza
Eduardo A. D. M. do Amparo
Ángela Cristina Arias Quintero
Carlos Magalhaes
Jarelin Judith Huayta Puente de La Vuega
Mauro Daniel Aranda
Raimundo Nonato Alves junior
Franklin de Souza Moura
Vagner Zil
Jeferson Silvério de Souza
João Marcus de Oliveira Souza
RUAN ALEXANDRE FREITAS DE PAULA GRACIANO
ANDERSON FABIAN FERNANDEZ FERNANDEZ
FERNANDA SILVA CORDEIRO
Laim Chamorro Valenzuela
Gisela Toscano
Melisa Anneris Fucks
David de Oliveira
José Evaldo de Jesus
Débora Cordeiro Knupp
Elaine Moreira Gonçalves
Jonatan Auky PInazo Haro
Johon Frank Paico Durand
Joel Güimac Tafur
Monique Bergmann
Rafael Sampaio Dias
Ricardo Alves
Vitor de Mello Carvalho Oliveira
Renato de Lima Semião
Lucinara Andrade Pereira Cabral
Samuel David Mogollon Infante
Javier Elías Torres Condori
Juan David Ramos Canahuire
Arland Ruben Rivera Briceño
Tony Paul Jarita Cruz
Ludwing Hanz Esqueche Surco
Daniel Franklin Vasquez Mamani
Liseht Katerhine Santos Carranza
Salazar López Elar
Juan Fari Choque Ortega
Jeremias Villegas
Eduardo Cayrus
ESTER HONORATO DE SOUZA
HERBETT SEGUNDO RODRIGUES
Odemiro Teixeira de Azevedo
Lucas Brito de Oliveira
Fernando Quispe Padilla
María José Flores Álvares
Eliézer Xavier Gomes
Thamires Ribeiro Mattos
Helder de Melo Moraes
Saúl Vara Allhuirca
Cielo Yaneli Hernandez Guillen
Doris Bullón Paucar
Jatir Bernardo Mota
Luiz Henrique Araújo Almeida
Brena Karoline Andrade Lima
Vinícius dos Santos Lima Vieira
Tátila Cardoso de França
Elindo Boaventura Camutali
RENATO MARQUES DE LIMA
Elino Ribeiro
José Zuñiga
Sávio Fernandes dos Santos
Rafael Ayala da Silva Rossi
ALINE OLIVEIRA ALENCAR FARIAS
JOSE BENTES DE FARIAS NETO
davi nascimento henriques
Felipe souza de Oliveira
Síria Cristhina Michiles Maciel
Aline da Silva Paulino
Magda Cristina Oliveira Brito
Mauricio Montoya
Sara Eva Pazo Huisa
Edelways Ramos Bendezu
Victor Hugo Correa Chuquista
Vania Stephany Sarzuri Cuellar
Valeria Esther Principe Mamani
Enoc Rodolfo Onofrio Varillas
Arceño Isidro Infante Mendoza
Lizeth Rojas Silva
Nick Brañez Medrano
Jacky Andrea Huanca Ceron
Karen Eliza Pérez Rojas
Grandez Tananta Hans Joel
Frank William Robles Vereau
Luis Felipe Nureña Aranda
Medalith Sollange Brenis Magallanes
Walter Enrique Navarro Tello
Jose Manuel Serrano Díaz
Hernández Saldarriaga Rosa Lorena
Gilmer Díaz Estela
ANTONIO PAULO DE ARAUJO MARINHO
Natanael Pereira da Conceição
ELENA RUTH PERALTA VIVAS
Ronnald Gonçalves Dos Santos
Matheus de Amaral dos Santos
Ivo Durães Mazzo
Gustavo Menezes Delgado
Priscila Baracho da Costa Sigolin
Remberto Sarzuri Marín
Camilly Eugênio Inacio
Ávila de Castro Calpes
Wesley de Souza Magalhães
Karen Thayse Boock Vasconcelos
Ávila de Castro Calpes
Wesley de Souza Magalhães
Andir Salamanca
Roberto Gajardo
Miguel de Oliveira Silva
Brian Ruiz
Wellington Gomes Nunes
Eduardo Castro
Eduardo Andrés Perez Sequeira
Víctor Hugo Lucuix Spalvier
Kenny Rivas
Rodrigo Montoya Baier
Jonas José Aguiar de Souza
Andrés Dinamarca
Sergio Casiano
Jaime Andrés Miranda Vera
Jhanyfer Dos Reis Carvalho Silva
Walter Lisandro Melo
Elva Emilia Gómez Oviedo
Danylo Weslley Duarte Bringel
Leonardo Leite Torres
Guilber Gotlib
Carlos Siqueira dos Santos
Josemar de Almeida Campos
Jaime Vilcapoma Quecara
Dehmer Lorena Valeria
Fernanda Marley de Oliveira Florencio
Aurélio Henrique de Vasconcelos Lima
Daywison Rocha de Miranda Florencio
Jonata Bezerra
José Carlos da Silva Cardoso
Tiago Luiz da Silva Nascimento
Arthur Felipe Simplício de Morais
Marcos Militão dos Santos
Joseane Maria dos Santos
Paulo Sergio Alves de Brito
JOSÉ HENRIQUE VELOSO CARNEIRO
Herson Felipe da Cunha Alves
Ana Alyce Vieira Cardoso
Manoel Chaves Medeiros Filho
GLEUDISNEY ADELMO BEZERRA
Priscila Reis Martins
Lucas do Nascimento Silva
David Collins Nunes de Almeida
José Afonso Alves Filho
Gerson Barbosa de Souza
Diogenes Moisés da Silva
Keyned Sá Galvão
José Antonio de Souza
Luciano Salviano de Oliveira
Charlys Siqueira
Sérgio Renato nascimento bernardes
Emanuel Martino
Martín Sebastian Montoya Bustamante
Jose Peñafiel
RICARDO PEÑAFIEL
Simone Oliveira Silva
NUBIA TEIXEIRA DA SILVA
HELBERT FERREIRA VARELA
Ricardo Luiz Reis Ribeiro
Gustavo Da Silva Barbosa
JOSE NILTON CARDOSO NUNES
Bruno Sousa Gomes
Miguel Jaramillo
Juan Enrique Moreira Cabanilla
Isrrael Samuel Delgado Contreras
Filipe Adrian de Oliveira Braggio
Rafael Stehling de Oliveira
Kleverson Rodrigo Ramos Sousa
Elvira Alvarado Espinoza
Rogers Roberto Laverde Palma
Oscar Armando Miranda León
Diego Andrés Muñoz Parraga
Carlos Julio Suárez Figueroa
Boris Chambi
CLECYO RODRIGUES FREITAS
Walter Toscano de Souza Correa
Luiz Alexandre Reis
Rodrigo Pontes de Lemos
Josemar Ventura
Alan Candido de Souza
Sara Nascimento Quintiliano
Andy Alf Romário Leão Figueiredo
Evandro Medeiros
Frank de Souza
Giovane de Abreu Lanza
Alfeu Rodrigues Duraes Filho
Laerte Lanza
Paulo Victor Macedo Morais
Matheus Gomes Severiano Silva
Jefferson José de Sant'Anna
Danilo da Costa terrão
Matheus da Silva Roque
Lucas dos Santos Abrahão
Eduardo Arantes Santos
Raphael de Moraes Souza
Gislaine Westphal
Cindy Mercede Rogel Tantarico
Raphael Leme Costa
Lara Leite de Oliveira
Adilson Alves
Rodrigo Baptista da Silveira
Isabele de Morais Silva
Vanessa Moraes de Souza  Oliveira
Jaqueline Camargo
Fabio Ferraz Lui
Roseli Rodrigues da Silva dos Santos
Richard Ogalha
Paulo Henrique da Cruz Donna
arthur henrique nunes gouvêa
LUCIANO DE PAULA BORGES
Eduardo Souza Nunes de Moura
Elias Batista Silva
Clayton Stoco de Oliveira
Tiago Hosokawa Wordell
Verivelton Mioto
Jéssica Cardoso Silva Steinkopf
Matheus Abegg
Gustavo Leighton
Lusideine Pereira Sousa
Erick Alves Medeiros
Sheyla Magali Paiva
Virgilio Noguera Rolon
David Wilfrido Dapozzo
Dilsiane Dos Reis Arco
Danitza Esther Diaz Melendez
Jenniss Neugebauer
Camila Vanesa Alvarez Martinez
Carlos Alberto Zurita Galaza
Daniele Suelem Rodrigues Nogueira
Pedro Ezequiela Gomes Freitas
Naassom Batista de Azevedo
Thalles da Paixão Lima
Izabella Rosa Sales
Vitor Lemos Oliveira
Fernando Gomes oliveira
Vinicius Ribeiro Rodrigues
Eliana Jeanette Villegas
David Omar Marcos
Nicolas Marcelo Luna Urrejola
Pedro Henrique Santos Moura
Nancy Srazuri
Federico Lucas Harillo
Carola Smith
Karen Quiñones
Noel Paco
Raúl Ureña
Marianela Imaña
Jhon Elvis Sinka
David Torrez
Rubén Chura
Benjamín Vargas
Stefany Lopez
Roly Chambi
Melany Añez
Carlos Jerez
Samuel Parada
Hubert Chambi
Javier Massi
Richard Retamoso
Diana Oropeza
Emerson Apaza Condori
Davi França
Carlos Henrique Fernandes Junior
Raphaela Carvalho
Matheus Felicio
Jonny Lucas Pereira da Silva
IGNACIO ANDRÉS QUIROZ RIVERA
GLENNYS CATALINA THOMANN SOLIS
JENNIFERT CAROL SOTO IBARRA
Bastian Andrés Fernández Lecaros
FERNANDO BATISTA DA SILVA JUNIOR
Abinoam Muniz Brandão
Otacílio Silvestre Porfírio
Ronaldo Vicente de Araujo
Silas Souza
Homero Pereira do Nascimento
Segundo Alonso Dávila Panduro
Sara Ellen Lima Leal
Sara Natali Gutierrez Alanes
Jônatas Lima Souza
Pablo Ricardo Gomes
Rômulo Thadeu Aragão Rocha
Kassio Farias dos Santos
Guilherme Melo
Sabrina Mamede
Gilson Patrick Fernandes Gomes
Rafael Garcia Nogueira
Claiver dos Santos da Silva
Matheus Morais Drobenko
Pedro Rodrigues Araujo Bisneto
Judson Rodrigo Pereira
Marcus Santos Plínio Filho
Robson Fonseca
Leticia Caron
Ellen Melo Cortizo
Gloria Barreto
Lizbeth Kanyat
André Felipe Pinheiro
Jenifer Costa
Sâmela Lima
Denill Morais Sousa
Eli Mendonça
Robson Nascimento Gonçalves de Castro
Ozeias de Souza Costa
Pablo Monteiro Moreira
Marcos Vinicius de Souza Nascimento
Ricardo Henrique Souza Santos
Daniel Santos de Oliveira
Mário Conceição Borges Júnior
Ismael Rocha Santana Buriti
Gustavo Menezes Moreira
Wirlem Miranda Oliveira
Gleisson da Cruz Santos
Alejandro Edimario da Silva
José Alexandre Santos de Brito
Micaelly Nery Menezes
Tiago Conceicao dos Santos
Thiago Lopes Fernandes
Ivo Araujo de Souza
Naor Prato Junior
Carlos Ferreira dos Santos
ANTONIO GLESIO MOURA PEREIRA
Everton Correa Ferreira
João Batista de Oliveira Oliveira
JOHN SANTOS DE SOUSA
Darwin Cobeña Salazar
Everson Santos do Rêgo
Anthony Gregory Alves de Abreu
Nylo César Rodrigues Pinto da Silva
Marllon da Silva Moreira
Roberto Roldão da Silva Junior
Jefferson Nascimento Braun
Rafael Felberg de Melo
Enzo Gilnei Pacheco Miranda
Pedro Salibi
Diógenes Mariano
Matheus dos Santos Rangel
Diogo de Carvalho Paulino
Eriton Aragão Silva
Sherman  Cauã Ferreira Carvalho
Vinicius Nogueira Damasceno
Tiago Donato de Melo
Claudinei Avelar
Paulo Henrique Campos
Manoel Texeira Nunes
Jederson Mello Zukovski
Kêmile Gonzaga Tomé
Leandro dos Santos Ferreira
Loabim da Silva Vieira
Breno Ribeiro dos Santos Silva
Tatiane Barreto
Denisson Andrade
Bruno Simeoni
Wagner Willyam de Sá
Tiago Fiuza
Douglas Pino
Emily Ferreira Soares Ribeiro
Luiz Ricardo Vieira Barros
Luis Guilherme Lima Soares
jhonatan de sousa carneiro
Rayanne Sousa Araújo
Kenny de Azevedo Moltocaro
Yuri Ferreira Aguiar
Marcos Salas Botia
Arthur de Sousa Rosa Cavalcante
Victor Ibraim de Oliveira
Anna Paula Rodrigues Pinto da Silva
Davi Alves Sousa
Lucas Phelipe de Sousa
João Paulo Peres Braga
Blesman Monteiro Silva
Juan Marcos Vargas Samaniego
Amanda Talita Araújo da Silva
LUAN MENDONCA SOUSA
Cláudyo Victor da Silva Teixeira
BRUNO SILVA DE MESQUITA
Odilon Almeida Barros
Eliezer Orlovic
Maiara Schalcher Alves Almeida
Bruna Yasmim Lopes da Silva
Thaís Cruz Orlovic
KENIO JOSE PANTOJA SILVA
jedison matos costa santos
BRUNO THIAGO ALENCAR FIGUEIREDO
Jean Quenehen
Keneth Abel Sanchez Cifuentes
Benny Trigo Porto
Jorge Marcio de Oliveira
JORGE MIGUEL RAMPOGNA
Reivellyn Almeida de Sousa Distreti
Gabriela Barbosa Lima
"""


def main():
    for line in RAW.strip().splitlines():
        line = re.sub(r"\s+", " ", line.strip())
        if not line:
            continue
        print(shorten_name(line))


if __name__ == "__main__":
    main()

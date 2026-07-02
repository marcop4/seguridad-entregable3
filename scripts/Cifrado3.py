import sys
import base64
import json

def pow_mod(base, exp, mod):
    return pow(base, exp, mod)

def mod_inverse(a, m):
    return pow(a, -1, m)

def aplicar_padding(mensaje):
    if len(mensaje) % 2 != 0:
        mensaje += '#'
    return [ord(c) for c in mensaje]

def cifrar_vortex(ascii_vals, llave, mult, shift):
    if mult % 2 == 0:
        mult += 1 # Ajuste a impar
    
    # 3.1 AddRoundKey
    xor_out = []
    for i, val in enumerate(ascii_vals):
        llave_pos = (llave + i) % 256
        xor_out.append(val ^ llave_pos)
        
    # 3.2 S-BOX
    sbox_out = []
    for val in xor_out:
        sbox_out.append(((val * mult) + shift) % 256)
        
    # 3.3 P-BOX
    pares = [val for i, val in enumerate(sbox_out) if i % 2 == 0]
    impares = [val for i, val in enumerate(sbox_out) if i % 2 != 0]
    pbox_out = pares + impares
    
    token_out = base64.b64encode(bytes(pbox_out)).decode('utf-8')
    return token_out

def descifrar_vortex(token_in, llave, mult, shift):
    if mult % 2 == 0:
        mult += 1
    inverso_mult = mod_inverse(mult, 256)
    
    try:
        cifrado_dec = list(base64.b64decode(token_in))
    except Exception as e:
        raise ValueError("Token base64 inválido")
        
    # 4.1 Revert P-Box
    mitad = len(cifrado_dec) // 2
    pares = cifrado_dec[:mitad]
    impares = cifrado_dec[mitad:]
    
    sbox_out = []
    for i in range(mitad):
        sbox_out.append(pares[i])
        sbox_out.append(impares[i])
        
    # 4.2 Revert S-Box
    xor_out = []
    for val in sbox_out:
        paso_sbox_inverso = ((val - shift) * inverso_mult) % 256
        xor_out.append(paso_sbox_inverso)
        
    # 4.3 Revert AddRoundKey
    descifrado_ascii = []
    for i, val in enumerate(xor_out):
        llave_pos = (llave + i) % 256
        original = val ^ llave_pos
        descifrado_ascii.append(original)
        
    texto_recuperado = "".join([chr(c) for c in descifrado_ascii]).replace('#', '')
    return texto_recuperado

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print(json.dumps({"status": "error", "message": "Argumentos insuficientes"}))
        sys.exit(1)
        
    action = sys.argv[1]
    text = sys.argv[2]
    
    try:
        llave = int(sys.argv[3])
        mult = int(sys.argv[4])
        shift = int(sys.argv[5])
        
        if action == "encrypt":
            ascii_crudos = aplicar_padding(text)
            resultado = cifrar_vortex(ascii_crudos, llave, mult, shift)
            print(json.dumps({"status": "success", "result": resultado}))
            
        elif action == "decrypt":
            resultado = descifrar_vortex(text, llave, mult, shift)
            print(json.dumps({"status": "success", "result": resultado}))
            
        else:
            print(json.dumps({"status": "error", "message": "Acción inválida"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)
document.querySelector('#btn-start-calc').addEventListener('click', function startCalculation() {
    const inputs = getFormInputs();
    let resp;
     resp = JSON.parse(mult(
            'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF43',//p
            'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF40',//a
            '77CE6C1515F3A8EDD2C13AABE4D8FBBE4CF55069978B9253B22E7D6BD69C03F1',//b
            '0',//gx
            '6BF7FC3CFB16D69F5CE4C9A351D6835D78913966C408F6521E29CF1804516A93',//gy
            inputs.d.value
        ));

    inputs.time.value = resp.time;
    inputs.qx.value = resp.x;
    inputs.qy.value = resp.y;
});

document.querySelector('#btn-paste-from-stb').addEventListener('click', function pasteValuesFromStb() {
    const inputs = getFormInputs();

        inputs.d.value = '69E273C25F23790C9E423207ED1F283418F2749C32F033456739734BB8B5661F';
});

function mult(m, a, b, qx, qy, scalar) {
    return Module.ccall(
        'mult',	// name of C function
        'string',	// return type
        ['string', 'string', 'string', 'string', 'string', 'string'],	// argument types
        [m, a, b, qx, qy, scalar]	// arguments
    );
}


function getFormInputs(values = false) {
    const form = document.querySelector('#form');
	
    if (values) {
        return {
            d: form.elements['curve-d'].value,
            time: form.elements['curve-time'].value,
            qx: form.elements['curve-qx'].value,
            qy: form.elements['curve-qy'].value
        }
    } else {
        return {
            d: form.elements['curve-d'],
            time: form.elements['curve-time'],
            qx: form.elements['curve-qx'],
            qy: form.elements['curve-qy']
        }
    }
}
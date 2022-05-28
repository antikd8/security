# Security

Drugov/Blinov project for security.

## Files and classes

### EC/EllipticCurve.cpp file contains math functions for points of elleptic curve:
1. function of scalar multiply(multiply point and scalar)
  input: scalar, point
  output: point
2. function add(sum of two points)
  input: point, point
  output: point
3. findSlope function(find duplicates)
  input: coordinates of two points
  output: true/false

### EC/BigInteger.cpp file contains helper functions for all operations with bigint.


### EC/NumberTheory.cpp file contains function of finding the module of M with base N.


### EC/point.cpp file contains getters and setters for point objects.


### EC/randomRecordingAlg.cpp file contains such functions as:
1. printArray(prints array);
2. findValue(search value in array);
3. pw(returns pw(k) = k % (2**w));
4. get_Dw(rewrites array without duplicates and sorts it);
5. get_D_k(rewrites array with an condition D[i] < k;
6. get_Wn(returns floor(log_2(max(D))));
7. getWMax(returns max element).

## Running the app

### First of all you should create a new project directory:

mkdir compiled_project


### To run our C code with WebAssembly you shoold to run the following command:

emcc EC/Project1/Source.cpp EC/Project1/NumeralConverter.cpp EC/BigInteger.cpp EC/EllipticCurve.cpp EC/point.cpp -O3 -s WASM=1 -s EXPORTED_FUNCTIONS="['_mult']" -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap']" -o compiled_project/EC.html --shell-file assets/template.html -s ERROR_ON_UNDEFINED_SYMBOLS=0 -s ASSERTIONS=1 && copy assets\custom_script.js compiled_project

### Finally start node server:

node server.js

### And that's it!

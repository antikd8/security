#include <iostream>
#include "randomRecordingAlg.cpp"

using namespace std;
using namespace RDP;

int main() {
    int k = 31415;
    BigInteger D[] = {1, 19, 23, 33, 47, 55, 79, 85, 89, 93};
    int size = sizeof(D)/sizeof(*D);
   
    BigInteger * result;
    int resultSize;
    RDPAlgorithm(k, D, size, result, resultSize);

    for (int i =0; i<resultSize; i++) {
        cout << result[i] << " ";
    }
    cout << endl;

    return 0;
}
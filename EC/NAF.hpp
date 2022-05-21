class NAF {
    public:
        NAF();
        NAF(int input[], int size);
        int * convertNAF(int k);
        void getNAF(int *&copyNAF);
        int getSize();
        friend std::ostream& operator <<(std::ostream& os, const NAF& p);
    private:
        int * NAFNumber;
        int nbits;
};

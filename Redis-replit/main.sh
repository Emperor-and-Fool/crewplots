curl https://codeload.github.com/redis/redis/tar.gz/refs/tags/7.0-rc1 -o file.tar.gz

tar -xzvf ./file.tar.gz

cd ./redis-7.0-rc1

make

cd ..

python move_binary.py